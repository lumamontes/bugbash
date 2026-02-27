import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $session } from '../stores/sessionStore';

const phaseLabels: Record<string, string> = {
  kickoff: 'Kickoff',
  execution: 'Execução',
  wrapup: 'Encerramento',
};

function formatTime(seconds: number): string {
  const absSeconds = Math.abs(seconds);
  const h = Math.floor(absSeconds / 3600);
  const m = Math.floor((absSeconds % 3600) / 60);
  const s = absSeconds % 60;
  const prefix = seconds < 0 ? '+' : '';
  if (h > 0) return `${prefix}${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${prefix}${m}:${s.toString().padStart(2, '0')}`;
}

export default function SessionTimer() {
  const session = useStore($session);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { status, startedAt, kickoffDuration, executionDuration, wrapupDuration } = session;

  if (!startedAt || !['kickoff', 'execution', 'wrapup'].includes(status)) {
    return null;
  }

  const start = new Date(startedAt).getTime();
  const elapsed = Math.floor((now - start) / 1000);
  const kickoffEnd = kickoffDuration * 60;
  const executionEnd = kickoffEnd + executionDuration * 60;

  let phaseDuration: number;
  let phaseElapsed: number;
  let phaseLabel: string;

  if (status === 'kickoff') {
    phaseDuration = kickoffDuration * 60;
    phaseElapsed = elapsed;
    phaseLabel = phaseLabels.kickoff;
  } else if (status === 'execution') {
    phaseDuration = executionDuration * 60;
    phaseElapsed = elapsed - kickoffEnd;
    phaseLabel = phaseLabels.execution;
  } else {
    phaseDuration = wrapupDuration * 60;
    phaseElapsed = elapsed - executionEnd;
    phaseLabel = phaseLabels.wrapup;
  }

  const remaining = phaseDuration - phaseElapsed;
  const isOvertime = remaining < 0;
  const isWarning = remaining > 0 && remaining <= 300;

  const color = isOvertime ? 'text-severity-blocker' : isWarning ? 'text-severity-minor' : 'text-text-primary';
  const dotColor = isOvertime ? 'var(--color-severity-blocker)' : isWarning ? 'var(--color-severity-minor)' : 'var(--color-primary-500)';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-1 border border-surface-3 rounded-xl">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${isWarning || isOvertime ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: dotColor }}
      />
      <span className="text-xs font-medium text-text-secondary">{phaseLabel}</span>
      <span className={`text-sm font-mono font-bold ${color}`}>
        {formatTime(remaining)}
      </span>
    </div>
  );
}
