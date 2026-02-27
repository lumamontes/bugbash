import { useEffect, useState, useRef } from 'react';

interface BadgeEvent {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

const tierColors: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#e5e4e2',
};

interface Props {
  sessionId: string;
  userId: string;
}

export default function BadgeToast({ sessionId, userId }: Props) {
  const [toasts, setToasts] = useState<BadgeEvent[]>([]);
  const shownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const evtSource = new EventSource(`/api/sessions/${sessionId}/sse`);

    evtSource.addEventListener('badge', (e) => {
      try {
        const badges = JSON.parse(e.data) as BadgeEvent[];
        const newBadges = badges.filter(b => !shownRef.current.has(b.id));

        if (newBadges.length > 0) {
          newBadges.forEach(b => shownRef.current.add(b.id));
          setToasts(prev => [...prev, ...newBadges]);

          // Fire confetti
          import('canvas-confetti').then(mod => {
            const confetti = mod.default;
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#6366f1', '#ffd700', '#cd7f32', '#22c55e'],
            });
          });
        }
      } catch {}
    });

    return () => evtSource.close();
  }, [sessionId]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((badge) => (
        <div
          key={badge.id}
          className="animate-slide-in bg-surface-1 border rounded-xl px-5 py-4 shadow-2xl max-w-sm flex items-center gap-4"
          style={{ borderColor: tierColors[badge.tier] || 'var(--color-primary-500)' }}
        >
          <span className="text-3xl">{badge.icon}</span>
          <div>
            <p className="text-white font-semibold text-sm">Conquista Desbloqueada!</p>
            <p className="text-white/90 text-sm font-medium">{badge.name}</p>
            <p className="text-white/50 text-xs mt-0.5">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
