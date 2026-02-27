import { atom } from 'nanostores';
import { $session } from './sessionStore';

export interface BugItem {
  id: string;
  title: string;
  severity: string;
  status: string;
  reportedVia: string;
  createdAt: string;
  reporterName: string;
}

export interface BadgeEvent {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

/** Live bug list, updated from SSE. */
export const $bugs = atom<BugItem[]>([]);

/** Total bug count from SSE. */
export const $bugCount = atom(0);

/** New badge events from SSE. */
export const $badges = atom<BadgeEvent[]>([]);

/** Live session status from SSE. */
export const $liveStatus = atom('');

/** Whether the SSE connection is active. */
export const $sseConnected = atom(false);

// Track which bug IDs we've already seen to avoid duplicates
let knownBugIds = new Set<string>();

/** Initialize the bug list (called from StoreInit with server-rendered data). */
export function initBugs(bugs: BugItem[]) {
  $bugs.set(bugs);
  knownBugIds = new Set(bugs.map(b => b.id));
}

// Shared SSE connection — one EventSource for all subscribers
let eventSource: EventSource | null = null;
let subscriberCount = 0;
let sessionUnsubscribe: (() => void) | null = null;

function connectSSE() {
  const sessionId = $session.get().id;
  if (!sessionId || eventSource) return;

  const es = new EventSource(`/api/sessions/${sessionId}/sse`);
  eventSource = es;
  $sseConnected.set(true);

  es.addEventListener('bugs', (e) => {
    try {
      const newBugs: BugItem[] = JSON.parse(e.data);
      const unique = newBugs.filter(b => !knownBugIds.has(b.id));
      if (unique.length > 0) {
        unique.forEach(b => knownBugIds.add(b.id));
        $bugs.set([...unique, ...$bugs.get()]);
      }
    } catch {}
  });

  es.addEventListener('count', (e) => {
    try {
      $bugCount.set(parseInt(e.data, 10));
    } catch {}
  });

  es.addEventListener('status', (e) => {
    $liveStatus.set(e.data.trim());
  });

  es.addEventListener('badge', (e) => {
    try {
      const badges: BadgeEvent[] = JSON.parse(e.data);
      $badges.set(badges);
    } catch {}
  });

  es.onerror = () => {
    es.close();
    eventSource = null;
    $sseConnected.set(false);
    // Reconnect after 5s
    setTimeout(() => {
      if (subscriberCount > 0) connectSSE();
    }, 5000);
  };
}

function disconnectSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
    $sseConnected.set(false);
  }
  if (sessionUnsubscribe) {
    sessionUnsubscribe();
    sessionUnsubscribe = null;
  }
}

/** Subscribe to SSE. Call the returned function to unsubscribe. */
export function subscribeSSE(): () => void {
  subscriberCount++;

  if (subscriberCount === 1) {
    // Try connecting now; if session ID isn't set yet, listen for it
    if ($session.get().id) {
      connectSSE();
    } else {
      sessionUnsubscribe = $session.listen((session) => {
        if (session.id && !eventSource) {
          connectSSE();
          // Stop listening once connected
          if (sessionUnsubscribe) {
            sessionUnsubscribe();
            sessionUnsubscribe = null;
          }
        }
      });
    }
  }

  return () => {
    subscriberCount--;
    if (subscriberCount <= 0) {
      subscriberCount = 0;
      disconnectSSE();
    }
  };
}
