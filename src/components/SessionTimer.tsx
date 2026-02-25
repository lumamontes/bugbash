import { useState, useEffect } from 'react';

interface Props {
  status: string;
  startedAt: string | null;
  kickoffDuration: number;
  executionDuration: number;
  wrapupDuration: number;
}

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
  const prefix = seconds < 0 ? '-' : '';
  if (h > 0) return `${prefix}${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${prefix}${m}:${s.toString().padStart(2, '0')}`;
}

export default function SessionTimer({ status, startedAt, kickoffDuration, executionDuration, wrapupDuration }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!startedAt || !['kickoff', 'execution', 'wrapup'].includes(status)) {
    return null;
  }

  const start = new Date(startedAt).getTime();
  const elapsed = Math.floor((now - start) / 1000);

  // Calculate phase boundaries in seconds from start
  const kickoffEnd = kickoffDuration * 60;
  const executionEnd = kickoffEnd + executionDuration * 60;
  const wrapupEnd = executionEnd + wrapupDuration * 60;

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
  const progress = Math.min(100, Math.max(0, (phaseElapsed / phaseDuration) * 100));
  const isOvertime = remaining < 0;
  const isWarning = remaining > 0 && remaining <= 300; // last 5 min

  const barColor = isOvertime ? '#ef4444' : isWarning ? '#eab308' : '#6366f1';

  return (
    <div className="bg-[#111118] border border-[#242430] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isWarning || isOvertime ? 'animate-pulse' : ''}`} style={{ backgroundColor: barColor }} />
          <span className="text-xs font-medium text-[#94a3b8]">{phaseLabel}</span>
        </div>
        <span
          className={`text-lg font-mono font-bold ${isOvertime ? 'text-[#ef4444]' : isWarning ? 'text-[#eab308]' : 'text-[#f1f5f9]'}`}
        >
          {formatTime(remaining)}
        </span>
      </div>
      <div className="w-full bg-[#242430] rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-[#64748b]">0:00</span>
        <span className="text-[10px] text-[#64748b]">{formatTime(phaseDuration)}</span>
      </div>
    </div>
  );
}
