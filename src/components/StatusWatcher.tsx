import { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { $session } from '../stores/sessionStore';
import { $liveStatus, subscribeSSE } from '../stores/sseStore';

const inactiveStatuses = new Set(['draft', 'scheduled']);

/**
 * Invisible component that watches for session status changes via SSE.
 * When status changes: fires a browser notification (if transitioning
 * from inactive to active) and reloads the page.
 */
export default function StatusWatcher() {
  const liveStatus = useStore($liveStatus);
  const session = useStore($session);
  const initialStatusRef = useRef('');

  useEffect(() => subscribeSSE(), []);

  useEffect(() => {
    if (!liveStatus) return;

    if (!initialStatusRef.current) {
      initialStatusRef.current = liveStatus;
      return;
    }

    if (liveStatus !== initialStatusRef.current) {
      // Fire browser notification when session starts (inactive → active)
      if (
        inactiveStatuses.has(initialStatusRef.current) &&
        !inactiveStatuses.has(liveStatus) &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification('Bug Bash', {
          body: `A sessão "${session.title}" começou!`,
          icon: '/favicon.svg',
        });
      }

      window.location.reload();
    }
  }, [liveStatus]);

  return null;
}
