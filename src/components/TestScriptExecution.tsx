import { useState, useEffect } from 'react';
import FormattedText from './FormattedText';

interface Step {
  id: string;
  instruction: string;
  expectedResult: string | null;
  orderIndex: number;
}

interface Script {
  id: string;
  title: string;
  description: string | null;
  steps: Step[];
}

interface StepResult {
  stepId: string;
  status: string;
  notes: string | null;
}

interface Props {
  sessionId: string;
  scripts: Script[];
}

const statusIcons: Record<string, string> = {
  passed: '\u2705',
  failed: '\u274C',
  blocked: '\u26D4',
  skipped: '\u23ED',
};

const statusLabels: Record<string, string> = {
  passed: 'Passou',
  failed: 'Falhou',
  blocked: 'Bloqueado',
  skipped: 'Ignorado',
};

const statusButtons = [
  { value: 'passed', label: 'Passou', color: '#22c55e' },
  { value: 'failed', label: 'Falhou', color: '#ef4444' },
  { value: 'blocked', label: 'Bloqueado', color: '#f97316' },
  { value: 'skipped', label: 'Ignorado', color: '#64748b' },
];

export default function TestScriptExecution({ sessionId, scripts }: Props) {
  const [results, setResults] = useState<Record<string, string>>({});
  const [expandedScript, setExpandedScript] = useState<string | null>(scripts[0]?.id || null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Load existing results
  useEffect(() => {
    if (scripts.length === 0) return;
    const scriptId = scripts[0].id;
    fetch(`/api/sessions/${sessionId}/scripts/${scriptId}/results`)
      .then(r => r.json())
      .then((data: StepResult[]) => {
        const map: Record<string, string> = {};
        data.forEach(r => { map[r.stepId] = r.status; });
        setResults(map);
      })
      .catch(() => {});
  }, [sessionId, scripts]);

  // When expanding a different script, load its results
  function handleExpandScript(scriptId: string) {
    setExpandedScript(expandedScript === scriptId ? null : scriptId);
    fetch(`/api/sessions/${sessionId}/scripts/${scriptId}/results`)
      .then(r => r.json())
      .then((data: StepResult[]) => {
        setResults(prev => {
          const next = { ...prev };
          data.forEach(r => { next[r.stepId] = r.status; });
          return next;
        });
      })
      .catch(() => {});
  }

  async function handleStepResult(scriptId: string, stepId: string, status: string) {
    setLoading(prev => ({ ...prev, [stepId]: true }));
    try {
      const res = await fetch(`/api/sessions/${sessionId}/scripts/${scriptId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, status }),
      });
      if (res.ok) {
        setResults(prev => ({ ...prev, [stepId]: status }));
      }
    } finally {
      setLoading(prev => ({ ...prev, [stepId]: false }));
    }
  }

  if (scripts.length === 0) {
    return <p className="text-[#64748b] text-sm py-4 text-center">Nenhum script de teste cadastrado.</p>;
  }

  return (
    <div className="space-y-3">
      {scripts.map(script => {
        const totalSteps = script.steps.length;
        const completedSteps = script.steps.filter(s => results[s.id]).length;
        const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
        const isExpanded = expandedScript === script.id;

        return (
          <div key={script.id} className="rounded-lg bg-[#1a1a24] overflow-hidden">
            {/* Script header */}
            <button
              onClick={() => handleExpandScript(script.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#242430] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#f1f5f9]">{script.title}</p>
                {script.description && (
                  <p className="text-xs text-[#64748b] mt-0.5 truncate">{script.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-[#242430] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: progress === 100 ? '#22c55e' : '#6366f1',
                      }}
                    />
                  </div>
                  <span className="text-xs text-[#64748b] whitespace-nowrap">
                    {completedSteps}/{totalSteps}
                  </span>
                </div>
                <span className={`text-[#64748b] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  &#9660;
                </span>
              </div>
            </button>

            {/* Steps */}
            {isExpanded && (
              <div className="border-t border-[#242430]">
                {script.steps.map((step, idx) => {
                  const stepStatus = results[step.id];
                  const isLoading = loading[step.id];

                  return (
                    <div
                      key={step.id}
                      className={`px-4 py-3 border-b border-[#242430] last:border-0 ${
                        stepStatus ? 'bg-[#111118]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-[#64748b] mt-0.5 w-6 flex-shrink-0 text-right">
                          {idx + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <FormattedText text={step.instruction} className="text-sm text-[#f1f5f9]" />
                          {step.expectedResult && (
                            <div className="text-xs text-[#64748b] mt-1">
                              <span className="font-medium">Esperado: </span>
                              <FormattedText text={step.expectedResult} className="inline" />
                            </div>
                          )}
                          {/* Status buttons */}
                          <div className="flex items-center gap-2 mt-2">
                            {statusButtons.map(btn => (
                              <button
                                key={btn.value}
                                onClick={() => handleStepResult(script.id, step.id, btn.value)}
                                disabled={isLoading}
                                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                  stepStatus === btn.value
                                    ? 'scale-105 ring-1 ring-current'
                                    : 'opacity-50 hover:opacity-80'
                                }`}
                                style={{
                                  color: btn.color,
                                  backgroundColor: `${btn.color}15`,
                                }}
                              >
                                {btn.label}
                              </button>
                            ))}
                            {stepStatus === 'failed' && (
                              <a
                                href={`/sessions/${sessionId}/bugs/new?stepId=${step.id}`}
                                className="ml-2 px-2 py-1 bg-[#ef4444]/10 text-[#ef4444] rounded text-xs font-medium hover:bg-[#ef4444]/20 transition-colors"
                              >
                                Reportar Bug
                              </a>
                            )}
                          </div>
                        </div>
                        {stepStatus && (
                          <span className="text-base flex-shrink-0" title={statusLabels[stepStatus]}>
                            {statusIcons[stepStatus]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
