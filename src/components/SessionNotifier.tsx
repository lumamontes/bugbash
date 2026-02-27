import { useEffect, useRef, useState } from 'react';

const inactiveStatuses = new Set(['draft', 'scheduled']);

interface Props {
  sessionId: string;
  sessionTitle: string;
}

export default function SessionNotifier({ sessionId, sessionTitle }: Props) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );
  const hasNotified = useRef(false);

  async function requestPermission() {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  useEffect(() => {
    const evtSource = new EventSource(`/api/sessions/${sessionId}/sse`);

    evtSource.addEventListener('status', (e) => {
      const newStatus = e.data.trim();

      if (!inactiveStatuses.has(newStatus) && !hasNotified.current) {
        hasNotified.current = true;

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Bug Bash', {
            body: `A sessão "${sessionTitle}" começou!`,
            icon: '/favicon.svg',
          });
        }

        setTimeout(() => window.location.reload(), 500);
      }
    });

    return () => evtSource.close();
  }, [sessionId, sessionTitle]);

  if (permission === 'unsupported' || permission === 'denied') {
    return null;
  }

  if (permission === 'default') {
    return (
      <button
        onClick={requestPermission}
        className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-primary-600/20 border border-primary-600/40 hover:bg-primary-600/30 text-primary-400 text-sm font-medium rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        Ativar notificações
      </button>
    );
  }

  return (
    <p className="mt-4 text-xs text-text-muted flex items-center gap-1.5 justify-center">
      <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Notificações ativadas
    </p>
  );
}
