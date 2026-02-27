import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { $session } from '../stores/sessionStore';
import { $user } from '../stores/sessionStore';
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

export default function SessionExecution({ sections, mode: initialMode = 'guided' }: Props) {
  const { id: sessionId } = useStore($session);
  const { id: userId } = useStore($user);
  const [activeMode, setActiveMode] = useState<'guided' | 'free'>(initialMode);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [executions, setExecutions] = useState<Record<string, Execution>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [otherExecutions, setOtherExecutions] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const scenarioRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeSections = sections.filter(s => s.status === 'active');

  // Auto-open first section with untested scenarios on load
  useEffect(() => {
    if (expandedSections.size > 0) return;
    const firstUntested = activeSections.find(s =>
      s.scenarios.some(sc => !executions[sc.id]?.status || executions[sc.id].status === 'not_started')
    );
    if (firstUntested) {
      setExpandedSections(new Set([firstUntested.id]));
    } else if (activeSections.length > 0) {
      setExpandedSections(new Set([activeSections[0].id]));
    }
  }, [activeSections.length > 0 && Object.keys(executions).length === 0]);

  // Load existing executions
  useEffect(() => {
    if (!sessionId) return;
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

  // Find the next untested scenario across all sections
  const findNextUntested = useCallback((afterScenarioId: string): { sectionId: string; scenarioId: string } | null => {
    let foundCurrent = false;
    for (const section of activeSections) {
      for (const scenario of section.scenarios) {
        if (scenario.id === afterScenarioId) {
          foundCurrent = true;
          continue;
        }
        if (foundCurrent) {
          const exec = executions[scenario.id];
          if (!exec?.status || exec.status === 'not_started') {
            return { sectionId: section.id, scenarioId: scenario.id };
          }
        }
      }
    }
    // Wrap around: check from beginning
    for (const section of activeSections) {
      for (const scenario of section.scenarios) {
        if (scenario.id === afterScenarioId) return null;
        const exec = executions[scenario.id];
        if (!exec?.status || exec.status === 'not_started') {
          return { sectionId: section.id, scenarioId: scenario.id };
        }
      }
    }
    return null;
  }, [activeSections, executions]);

  const handleExecute = useCallback(async (scenarioId: string, status: ExecutionStatus) => {
    const comment = comments[scenarioId] || '';

    if ((status === 'partial' || status === 'blocked') && !comment.trim()) {
      // Expand the scenario to show the comment field
      setExpandedScenario(scenarioId);
      setTimeout(() => {
        const el = document.getElementById(`comment-${scenarioId}`);
        el?.focus();
      }, 100);
      return;
    }

    // Optimistic update
    const previousExecution = executions[scenarioId];
    setExecutions(prev => ({ ...prev, [scenarioId]: { scenarioId, status, comment } }));

    try {
      const res = await fetch(`/api/sessions/${sessionId}/scenarios/${scenarioId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment: comment || undefined }),
      });
      if (!res.ok) {
        setExecutions(prev => {
          const next = { ...prev };
          if (previousExecution) next[scenarioId] = previousExecution;
          else delete next[scenarioId];
          return next;
        });
        return;
      }
    } catch {
      setExecutions(prev => {
        const next = { ...prev };
        if (previousExecution) next[scenarioId] = previousExecution;
        else delete next[scenarioId];
        return next;
      });
      return;
    }

    // Auto-advance: find next untested scenario
    if (status !== 'partial' && status !== 'blocked') {
      const next = findNextUntested(scenarioId);
      if (next) {
        // Open the section if not already open
        setExpandedSections(prev => {
          const updated = new Set(prev);
          updated.add(next.sectionId);
          return updated;
        });
        setExpandedScenario(null);
        // Scroll to next scenario after render
        setTimeout(() => {
          scenarioRefs.current[next.scenarioId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
      }
    }
  }, [sessionId, comments, executions, findNextUntested]);

  // Section progress helpers
  function getSectionProgress(section: Section) {
    const total = section.scenarios.length;
    if (total === 0) return { done: 0, total: 0, percent: 0 };
    const done = section.scenarios.filter(s => executions[s.id]?.status && executions[s.id].status !== 'not_started').length;
    return { done, total, percent: Math.round((done / total) * 100) };
  }

  function getOverallProgress() {
    let done = 0, total = 0;
    for (const section of activeSections) {
      const p = getSectionProgress(section);
      done += p.done;
      total += p.total;
    }
    return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

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

  function toggleSection(sectionId: string) {
    setExpandedSections(prev => {
      const updated = new Set(prev);
      if (updated.has(sectionId)) updated.delete(sectionId);
      else updated.add(sectionId);
      return updated;
    });
  }

  function findSectionForScenario(scenarioId: string): string | undefined {
    return activeSections.find(s => s.scenarios.some(sc => sc.id === scenarioId))?.id;
  }

  const overall = getOverallProgress();

  return (
    <div className="flex flex-col w-full">
      {/* Mode Tabs */}
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
        <div className="space-y-3">
          {/* Overall Progress Bar */}
          <div className="bg-surface-2 border border-surface-3 rounded-lg px-4 py-3 flex items-center gap-4">
            <span className="text-sm text-text-secondary font-medium whitespace-nowrap">
              {overall.done}/{overall.total} cenários
            </span>
            <div className="flex-1 bg-surface-0 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${overall.percent}%`,
                  backgroundColor: overall.percent === 100 ? 'var(--color-severity-enhancement)' : 'var(--color-primary-500)',
                }}
              />
            </div>
            <span className="text-sm font-semibold text-text-primary w-10 text-right">{overall.percent}%</span>
          </div>

          {/* Collapsible Sections */}
          {activeSections.map(section => {
            const progress = getSectionProgress(section);
            const isOpen = expandedSections.has(section.id);

            return (
              <div key={section.id} className="border border-surface-3 rounded-lg overflow-hidden">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-surface-2 hover:bg-surface-3 transition-colors"
                >
                  <span className={`text-xs text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <span className="text-sm font-semibold text-text-primary flex-1 text-left truncate">
                    {section.title}
                  </span>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {progress.done}/{progress.total}
                  </span>
                  <div className="w-20 bg-surface-0 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${progress.percent}%`,
                        backgroundColor: progress.percent === 100 ? 'var(--color-severity-enhancement)' : 'var(--color-primary-500)',
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-8 text-right">{progress.percent}%</span>
                </button>

                {/* Section Content */}
                {isOpen && (
                  <div className="divide-y divide-surface-3">
                    {section.description && (
                      <div className="px-4 py-2 bg-surface-1">
                        <FormattedText text={section.description} className="text-xs text-text-muted" />
                      </div>
                    )}
                    {section.scenarios.map(scenario => {
                      const exec = executions[scenario.id];
                      const isExpanded = expandedScenario === scenario.id;
                      const depMet = isDependencyMet(scenario);
                      const othersCount = otherExecutions[scenario.id]?.length || 0;
                      const currentStatus = exec?.status as ExecutionStatus | undefined;
                      const needsComment = currentStatus === 'partial' || currentStatus === 'blocked';

                      return (
                        <div
                          key={scenario.id}
                          ref={el => { scenarioRefs.current[scenario.id] = el; }}
                          className={`transition-colors ${
                            isExpanded ? 'bg-surface-2' : 'bg-surface-1 hover:bg-surface-2'
                          }`}
                        >
                          {/* Scenario Row */}
                          <div className="flex items-center gap-2 px-4 py-2.5 min-h-[44px]">
                            {/* Status indicator */}
                            <span
                              className="w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 rounded-full"
                              style={currentStatus ? {
                                color: statusConfig[currentStatus]?.color,
                                backgroundColor: `${statusConfig[currentStatus]?.color}20`,
                              } : {
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              {currentStatus ? statusConfig[currentStatus].icon : '·'}
                            </span>

                            {/* Title (clickable to expand) */}
                            <button
                              onClick={() => setExpandedScenario(isExpanded ? null : scenario.id)}
                              className="flex-1 text-left flex items-center gap-2 min-w-0"
                            >
                              <span className={`text-sm truncate ${
                                currentStatus ? 'text-text-secondary' : 'text-text-primary'
                              }`}>
                                {scenario.title}
                              </span>
                              {scenario.persona && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-600/20 text-primary-400 flex-shrink-0">
                                  {scenario.persona}
                                </span>
                              )}
                              {othersCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-3 text-text-muted flex-shrink-0" title="Testado por outros participantes">
                                  +{othersCount}
                                </span>
                              )}
                            </button>

                            {/* Inline status buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {(Object.entries(statusConfig) as [ExecutionStatus, typeof statusConfig[ExecutionStatus]][]).map(([status, cfg]) => (
                                <button
                                  key={status}
                                  onClick={() => handleExecute(scenario.id, status)}
                                  title={cfg.label}
                                  className={`w-6 h-6 rounded-full text-xs flex items-center justify-center transition-all ${
                                    currentStatus === status
                                      ? 'ring-2 ring-offset-1 ring-offset-surface-1 scale-110'
                                      : 'opacity-40 hover:opacity-100'
                                  }`}
                                  style={{
                                    color: cfg.color,
                                    backgroundColor: `${cfg.color}15`,
                                    ...(currentStatus === status ? { ringColor: cfg.color } : {}),
                                  }}
                                >
                                  {cfg.icon}
                                </button>
                              ))}

                              {exec?.status === 'fail' && (
                                <a
                                  href={`/sessions/${sessionId}/bugs/new?scenarioId=${scenario.id}&sectionId=${findSectionForScenario(scenario.id)}`}
                                  className="ml-1 w-6 h-6 rounded-full text-xs flex items-center justify-center bg-severity-blocker/15 text-severity-blocker hover:bg-severity-blocker/25 transition-colors"
                                  title="Reportar Bug"
                                >
                                  🐛
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Dependency warning */}
                          {!depMet && scenario.dependsOn && (
                            <p className="text-xs text-severity-major px-4 pb-2 pl-11">
                              Depende de: {getDependencyScenarioTitle(scenario.dependsOn)}
                            </p>
                          )}

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-4 pb-3 pt-1 pl-11 space-y-2">
                              {scenario.precondition && (
                                <div>
                                  <p className="text-xs font-medium text-text-muted mb-0.5">Pré-condição</p>
                                  <FormattedText text={scenario.precondition} className="text-sm text-text-secondary bg-surface-0 p-2 rounded" />
                                </div>
                              )}
                              {scenario.stepsToExecute && (
                                <div>
                                  <p className="text-xs font-medium text-text-muted mb-0.5">Passos</p>
                                  <FormattedText text={scenario.stepsToExecute} className="text-sm text-text-secondary bg-surface-0 p-2 rounded" />
                                </div>
                              )}
                              {scenario.expectedResult && (
                                <div>
                                  <p className="text-xs font-medium text-text-muted mb-0.5">Resultado Esperado</p>
                                  <FormattedText text={scenario.expectedResult} className="text-sm text-text-secondary bg-surface-0 p-2 rounded" />
                                </div>
                              )}
                              {scenario.keyRules && (
                                <div>
                                  <p className="text-xs font-medium text-text-muted mb-0.5">Regras-chave</p>
                                  <FormattedText text={scenario.keyRules} className="text-sm text-text-secondary bg-surface-0 p-2 rounded" />
                                </div>
                              )}

                              {/* Comment field — only for partial/blocked or if already expanded and user wants to add one */}
                              {(needsComment || isExpanded) && (
                                <div>
                                  <label className="text-xs font-medium text-text-muted mb-0.5 block">
                                    Comentário {needsComment && <span className="text-severity-major">*</span>}
                                  </label>
                                  <textarea
                                    id={`comment-${scenario.id}`}
                                    value={comments[scenario.id] || ''}
                                    onChange={e => setComments(prev => ({ ...prev, [scenario.id]: e.target.value }))}
                                    placeholder={needsComment ? 'Obrigatório — descreva o que aconteceu...' : 'Observações (opcional)...'}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                                  />
                                  {needsComment && !comments[scenario.id]?.trim() && (
                                    <p className="text-xs text-severity-major mt-0.5">Comentário obrigatório para status parcial/bloqueado</p>
                                  )}
                                </div>
                              )}

                              {/* Larger status buttons inside expanded view for easier touch */}
                              <div className="flex items-center gap-2 flex-wrap pt-1">
                                {(Object.entries(statusConfig) as [ExecutionStatus, typeof statusConfig[ExecutionStatus]][]).map(([status, cfg]) => (
                                  <button
                                    key={status}
                                    onClick={() => handleExecute(scenario.id, status)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                                      currentStatus === status
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
                                    href={`/sessions/${sessionId}/bugs/new?scenarioId=${scenario.id}&sectionId=${findSectionForScenario(scenario.id)}`}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Free Exploration Mode — unchanged */
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
                            width: `${progress.percent}%`,
                            backgroundColor: progress.percent === 100 ? 'var(--color-severity-enhancement)' : 'var(--color-primary-500)',
                          }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-8 text-right">{progress.percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
