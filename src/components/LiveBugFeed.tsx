import { useState, useEffect, useRef } from 'react';

interface BugItem {
  id: string;
  title: string;
  severity: string;
  status: string;
  reportedVia: string;
  createdAt: string;
  reporterName: string;
}

interface Props {
  sessionId: string;
  initialBugs: BugItem[];
}

const severityColors: Record<string, string> = {
  blocker: '#ef4444',
  major: '#f97316',
  minor: '#eab308',
  enhancement: '#22c55e',
};

const severityLabels: Record<string, string> = {
  blocker: 'Bloqueante',
  major: 'Grave',
  minor: 'Menor',
  enhancement: 'Melhoria',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export default function LiveBugFeed({ sessionId, initialBugs }: Props) {
  const [bugs, setBugs] = useState<BugItem[]>(initialBugs);
  const [newCount, setNewCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/sessions/${sessionId}/sse`);
    eventSourceRef.current = es;

    es.addEventListener('bugs', (e) => {
      try {
        const newBugs: BugItem[] = JSON.parse(e.data);
        setBugs(prev => {
          const existingIds = new Set(prev.map(b => b.id));
          const unique = newBugs.filter(b => !existingIds.has(b.id));
          if (unique.length > 0) {
            setNewCount(c => c + unique.length);
            return [...unique, ...prev];
          }
          return prev;
        });
      } catch {}
    });

    es.onerror = () => {
      es.close();
      // Reconnect after 5s
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          eventSourceRef.current = new EventSource(`/api/sessions/${sessionId}/sse`);
        }
      }, 5000);
    };

    return () => {
      es.close();
    };
  }, [sessionId]);

  // Clear new count after 3s
  useEffect(() => {
    if (newCount > 0) {
      const t = setTimeout(() => setNewCount(0), 3000);
      return () => clearTimeout(t);
    }
  }, [newCount]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Bug Feed</h3>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-severity-enhancement rounded-full animate-pulse" />
            <span className="text-xs text-text-muted">ao vivo</span>
          </span>
        </div>
        {newCount > 0 && (
          <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full animate-bounce">
            +{newCount} novo(s)
          </span>
        )}
      </div>

      {bugs.length === 0 ? (
        <p className="text-text-muted text-sm py-8 text-center">Nenhum bug reportado ainda.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {bugs.map((bug, i) => (
            <a
              key={bug.id}
              href={`/sessions/${sessionId}/bugs/${bug.id}`}
              className={`block p-3 rounded-lg bg-surface-2 hover:bg-surface-3 transition-all ${
                i < newCount ? 'ring-1 ring-primary-500/50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{bug.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-secondary">{bug.reporterName}</span>
                    <span className="text-xs text-text-muted">{timeAgo(bug.createdAt)}</span>
                    {bug.reportedVia === 'widget' && (
                      <span className="text-[10px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded">widget</span>
                    )}
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                  style={{
                    backgroundColor: `${severityColors[bug.severity]}20`,
                    color: severityColors[bug.severity],
                  }}
                >
                  {severityLabels[bug.severity]}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
