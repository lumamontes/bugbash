import { useState, useEffect, useCallback } from 'react';
import FormattedText from './FormattedText';

interface Scenario {
  id: string;
  title: string;
  precondition?: string | null;
  stepsToExecute?: string | null;
  expectedResult?: string | null;
  keyRules?: string | null;
  dependsOn?: string | null;
  persona?: string | null;
  sortOrder: number;
}

interface Section {
  id: string;
  title: string;
  description?: string | null;
  status: 'active' | 'draft' | 'not_ready';
  notReadyReason?: string | null;
  scenarios: Scenario[];
  sortOrder: number;
  scriptTitle?: string;
}

interface Execution {
  scenarioId: string;
  status: string;
  comment?: string | null;
}

interface Props {
  sessionId: string;
  userId: string;
  sections: Section[];
  mode?: 'guided' | 'free';
}

const statusConfig = {
  pass: { label: 'Passou', color: '#22c55e', icon: '✓' },
  partial: { label: 'Parcial', color: '#eab308', icon: '◐' },
  fail: { label: 'Falhou', color: '#ef4444', icon: '✗' },
  blocked: { label: 'Bloqueado', color: '#f97316', icon: '⊘' },
  skipped: { label: 'Ignorar', color: '#64748b', icon: '⏭' },
} as const;

type ExecutionStatus = keyof typeof statusConfig;

export default function SessionExecution({ sessionId, userId, sections, mode: initialMode = 'guided' }: Props) {
  const [activeMode, setActiveMode] = useState<'guided' | 'free'>(initialMode);
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id || '');
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [executions, setExecutions] = useState<Record<string, Execution>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [otherExecutions, setOtherExecutions] = useState<Record<string, string[]>>({});

  // Load existing executions
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/coverage`)
      .then(r => r.json())
      .then((data: { participants: any[]; sections: any[] }) => {
        const myExecs: Record<string, Execution> = {};
        const othersMap: Record<string, string[]> = {};

        for (const section of data.sections) {
          for (const [scenarioId, userMap] of Object.entries(section.matrix as Record<string, Record<string, string>>)) {
            for (const [uid, status] of Object.entries(userMap)) {
              if (uid === userId && status !== 'not_started') {
                myExecs[scenarioId] = { scenarioId, status };
              } else if (uid !== userId && status !== 'not_started') {
                if (!othersMap[scenarioId]) othersMap[scenarioId] = [];
                othersMap[scenarioId].push(status);
              }
            }
          }
        }
        setExecutions(myExecs);
        setOtherExecutions(othersMap);
      })
      .catch(() => {});
  }, [sessionId, userId]);

  const handleExecute = useCallback(async (scenarioId: string, status: ExecutionStatus) => {
    const comment = comments[scenarioId] || '';

    if ((status === 'partial' || status === 'blocked') && !comment.trim()) {
      const el = document.getElementById(`comment-${scenarioId}`);
      el?.focus();
      return;
    }

    // Optimistic update — show selection immediately
    const previousExecution = executions[scenarioId];
    setExecutions(prev => ({ ...prev, [scenarioId]: { scenarioId, status, comment } }));

    try {
      const res = await fetch(`/api/sessions/${sessionId}/scenarios/${scenarioId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment: comment || undefined }),
      });
      if (!res.ok) {
        // Rollback on failure
        setExecutions(prev => {
          const next = { ...prev };
          if (previousExecution) {
            next[scenarioId] = previousExecution;
          } else {
            delete next[scenarioId];
          }
          return next;
        });
      }
    } catch {
      // Rollback on network error
      setExecutions(prev => {
        const next = { ...prev };
        if (previousExecution) {
          next[scenarioId] = previousExecution;
        } else {
          delete next[scenarioId];
        }
        return next;
      });
    }
  }, [sessionId, comments, executions]);

  const activeSection = sections.find(s => s.id === activeSectionId);
  const activeSections = sections.filter(s => s.status === 'active');

  // Calculate section progress
  function getSectionProgress(section: Section) {
    const total = section.scenarios.length;
    if (total === 0) return 0;
    const done = section.scenarios.filter(s => executions[s.id]?.status && executions[s.id].status !== 'not_started').length;
    return Math.round((done / total) * 100);
  }

  // Check if dependency is met
  function isDependencyMet(scenario: Scenario): boolean {
    if (!scenario.dependsOn) return true;
    const dep = executions[scenario.dependsOn];
    return dep?.status === 'pass' || dep?.status === 'partial';
  }

  function getDependencyScenarioTitle(dependsOnId: string): string {
    for (const section of sections) {
      const s = section.scenarios.find(sc => sc.id === dependsOnId);
      if (s) return s.title;
    }
    return 'cenário anterior';
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Mode Tabs */}
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveMode('guided')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeMode === 'guided'
                ? 'bg-primary-600 text-white'
                : 'bg-surface-2 text-text-secondary hover:text-white'
            }`}
          >
            Roteiro Guiado
          </button>
          <button
            onClick={() => setActiveMode('free')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeMode === 'free'
                ? 'bg-primary-600 text-white'
                : 'bg-surface-2 text-text-secondary hover:text-white'
            }`}
          >
            Exploração Livre
          </button>
        </div>

        {activeMode === 'guided' ? (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Section Sidebar */}
            <div className="w-64 flex-shrink-0 space-y-1">
              {activeSections.map(section => {
                const progress = getSectionProgress(section);
                const isActive = section.id === activeSectionId;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-surface-3 border border-primary-500/50'
                        : 'bg-surface-2 hover:bg-surface-3 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium truncate ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {section.title}
                      </span>
                      <span className="text-xs text-text-muted ml-2">{progress}%</span>
                    </div>
                    <div className="w-full bg-surface-0 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: progress === 100 ? 'var(--color-severity-enhancement)' : 'var(--color-primary-500)',
                        }}
                      />
                    </div>
                    <span className="text-xs text-text-muted mt-1 block">
                      {section.scenarios.length} cenário(s)
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scenario Cards */}
            <div className="flex-1 space-y-3 overflow-y-auto">
              {activeSection ? (
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">{activeSection.title}</h3>
                    {activeSection.description && (
                      <FormattedText text={activeSection.description} className="text-sm text-text-muted mt-1" />
                    )}
                  </div>
                  {activeSection.scenarios.map(scenario => {
                    const exec = executions[scenario.id];
                    const isExpanded = expandedScenario === scenario.id;
                    const depMet = isDependencyMet(scenario);
                    const othersCount = otherExecutions[scenario.id]?.length || 0;

                    return (
                      <div
                        key={scenario.id}
                        className={`rounded-lg border transition-colors ${
                          exec?.status === 'pass' ? 'border-severity-enhancement/50 bg-severity-enhancement/10' :
                          exec?.status === 'fail' ? 'border-severity-blocker/50 bg-severity-blocker/10' :
                          exec?.status === 'partial' ? 'border-severity-minor/50 bg-severity-minor/10' :
                          exec?.status === 'blocked' ? 'border-severity-major/50 bg-severity-major/10' :
                          'border-surface-3 bg-surface-2'
                        }`}
                      >
                        {/* Scenario Header */}
                        <button
                          onClick={() => setExpandedScenario(isExpanded ? null : scenario.id)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-text-primary">{scenario.title}</span>
                              {scenario.persona && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-600/20 text-primary-400">
                                  {scenario.persona}
                                </span>
                              )}
                              {othersCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-3 text-text-muted" title="Testado por outros participantes">
                                  +{othersCount} testou
                                </span>
                              )}
                            </div>
                            {!depMet && scenario.dependsOn && (
                              <p className="text-xs text-severity-major mt-1">
                                Depende de: {getDependencyScenarioTitle(scenario.dependsOn)}
                              </p>
                            )}
                          </div>
                          {exec && (
                            <span
                              className="text-lg flex-shrink-0"
                              style={{ color: statusConfig[exec.status as ExecutionStatus]?.color }}
                            >
                              {statusConfig[exec.status as ExecutionStatus]?.icon}
                            </span>
                          )}
                          <span className={`text-text-muted text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-surface-3 pt-3 space-y-3">
                            {scenario.precondition && (
                              <div>
                                <p className="text-xs font-medium text-text-muted mb-1">Pré-condição</p>
                                <FormattedText text={scenario.precondition} className="text-sm text-text-secondary bg-surface-0 p-2 rounded" />
                              </div>
                            )}
                            {scenario.stepsToExecute && (
                              <div>
                                <p className="text-xs font-medium text-text-muted mb-1">Passos</p>
                                <FormattedText text={scenario.stepsToExecute} className="text-sm text-text-secondary bg-surface-0 p-2 rounded" />
                              </div>
                            )}
                            {scenario.expectedResult && (
                              <div>
                                <p className="text-xs font-medium text-text-muted mb-1">Resultado Esperado</p>
                                <FormattedText text={scenario.expectedResult} className="text-sm text-text-secondary bg-surface-0 p-2 rounded" />
                              </div>
                            )}
                            {scenario.keyRules && (
                              <div>
                                <p className="text-xs font-medium text-text-muted mb-1">Regras-chave</p>
                                <FormattedText text={scenario.keyRules} className="text-sm text-text-secondary bg-surface-0 p-2 rounded" />
                              </div>
                            )}

                            {/* Comment field */}
                            <div>
                              <label className="text-xs font-medium text-text-muted mb-1 block">Comentário</label>
                              <textarea
                                id={`comment-${scenario.id}`}
                                value={comments[scenario.id] || ''}
                                onChange={e => setComments(prev => ({ ...prev, [scenario.id]: e.target.value }))}
                                placeholder="Observações, detalhes do teste..."
                                rows={2}
                                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                              />
                              {(exec?.status === 'partial' || exec?.status === 'blocked') && !comments[scenario.id]?.trim() && (
                                <p className="text-xs text-severity-major mt-1">Comentário obrigatório para status parcial/bloqueado</p>
                              )}
                            </div>

                            {/* Status Buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {(Object.entries(statusConfig) as [ExecutionStatus, typeof statusConfig[ExecutionStatus]][]).map(([status, cfg]) => (
                                <button
                                  key={status}
                                  onClick={() => handleExecute(scenario.id, status)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                                    exec?.status === status
                                      ? 'ring-1 ring-current scale-105'
                                      : 'opacity-60 hover:opacity-100'
                                  }`}
                                  style={{
                                    color: cfg.color,
                                    backgroundColor: `${cfg.color}15`,
                                  }}
                                >
                                  <span>{cfg.icon}</span>
                                  <span>{cfg.label}</span>
                                </button>
                              ))}

                              {exec?.status === 'fail' && (
                                <a
                                  href={`/sessions/${sessionId}/bugs/new?scenarioId=${scenario.id}&sectionId=${activeSection.id}`}
                                  className="ml-2 px-3 py-1.5 bg-severity-blocker/10 text-severity-blocker rounded-lg text-xs font-medium hover:bg-severity-blocker/20 transition-colors"
                                >
                                  Reportar Bug
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-text-muted text-sm text-center py-8">Selecione uma seção para começar</p>
              )}
            </div>
          </div>
        ) : (
          /* Free Exploration Mode */
          <div className="space-y-4">
            <div className="bg-surface-2 border border-surface-3 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-text-primary mb-2">Exploração Livre</h3>
              <p className="text-sm text-text-muted mb-6">
                Explore o sistema livremente. Use os botões abaixo para reportar o que encontrar.
              </p>
              <div className="flex items-center justify-center gap-4">
                <a
                  href={`/sessions/${sessionId}/bugs/new?mode=freeform&type=bug`}
                  className="px-6 py-3 bg-severity-blocker hover:bg-severity-blocker/80 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <span className="text-lg">🐛</span>
                  Bug
                </a>
                <a
                  href={`/sessions/${sessionId}/bugs/new?mode=freeform&type=improvement`}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <span className="text-lg">💡</span>
                  Melhoria
                </a>
                <a
                  href={`/sessions/${sessionId}/bugs/new?mode=freeform&type=ux_insight`}
                  className="px-6 py-3 bg-accent-500 hover:bg-accent-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <span className="text-lg">🎨</span>
                  Insight UX
                </a>
              </div>
            </div>

            {/* Quick overview of guided progress */}
            {activeSections.length > 0 && (
              <div className="bg-surface-2 border border-surface-3 rounded-lg p-4">
                <p className="text-xs font-medium text-text-muted mb-3">Progresso do Roteiro</p>
                <div className="space-y-2">
                  {activeSections.map(section => {
                    const progress = getSectionProgress(section);
                    return (
                      <div key={section.id} className="flex items-center gap-3">
                        <span className="text-xs text-text-secondary truncate flex-1">{section.title}</span>
                        <div className="w-24 bg-surface-0 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: progress === 100 ? 'var(--color-severity-enhancement)' : 'var(--color-primary-500)',
                            }}
                          />
                        </div>
                        <span className="text-xs text-text-muted w-8 text-right">{progress}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
