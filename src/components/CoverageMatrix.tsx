import { useState, useEffect } from 'react';

interface Participant {
  userId: string;
  userName: string;
}

interface Scenario {
  id: string;
  title: string;
  persona?: string | null;
}

interface SectionCoverage {
  id: string;
  title: string;
  status: string;
  scenarios: Scenario[];
  matrix: Record<string, Record<string, string>>;
  gaps: string[];
  conflicts: string[];
  coverage: number;
}

interface CoverageData {
  participants: Participant[];
  sections: SectionCoverage[];
}

interface Props {
  sessionId: string;
  autoRefresh?: boolean;
}

const statusColors: Record<string, string> = {
  pass: '#22c55e',
  partial: '#eab308',
  fail: '#ef4444',
  blocked: '#f97316',
  skipped: '#64748b',
  not_started: '#1a1a24',
};

const statusLabels: Record<string, string> = {
  pass: 'Passou',
  partial: 'Parcial',
  fail: 'Falhou',
  blocked: 'Bloqueado',
  skipped: 'Ignorado',
};

export default function CoverageMatrix({ sessionId, autoRefresh = false }: Props) {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'gaps' | 'conflicts'>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const fetchData = () => {
    fetch(`/api/sessions/${sessionId}/coverage`)
      .then(r => r.json())
      .then((d: CoverageData) => {
        setData(d);
        setLoading(false);
        if (!expandedSection && d.sections.length > 0) {
          setExpandedSection(d.sections[0].id);
        }
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      const interval = setInterval(fetchData, 15000);
      return () => clearInterval(interval);
    }
  }, [sessionId, autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-text-muted">Carregando matriz de cobertura...</div>
      </div>
    );
  }

  if (!data || data.sections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-muted">Nenhum cenário de teste cadastrado.</p>
      </div>
    );
  }

  const totalScenarios = data.sections.reduce((sum, s) => sum + s.scenarios.length, 0);
  const totalGaps = data.sections.reduce((sum, s) => sum + s.gaps.length, 0);
  const totalConflicts = data.sections.reduce((sum, s) => sum + s.conflicts.length, 0);
  const overallCoverage = totalScenarios > 0
    ? Math.round(((totalScenarios - totalGaps) / totalScenarios) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-surface-2 border border-surface-3 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-text-primary">{overallCoverage}%</p>
          <p className="text-xs text-text-muted">Cobertura</p>
        </div>
        <div className="bg-surface-2 border border-surface-3 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-text-primary">{totalScenarios}</p>
          <p className="text-xs text-text-muted">Cenários</p>
        </div>
        <div className="bg-surface-2 border border-surface-3 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-severity-blocker">{totalGaps}</p>
          <p className="text-xs text-text-muted">Gaps</p>
        </div>
        <div className="bg-surface-2 border border-surface-3 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-severity-major">{totalConflicts}</p>
          <p className="text-xs text-text-muted">Conflitos</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'all' ? 'bg-primary-600 text-white' : 'bg-surface-2 text-text-secondary hover:text-white'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('gaps')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'gaps' ? 'bg-severity-blocker text-white' : 'bg-surface-2 text-text-secondary hover:text-white'
          }`}
        >
          Gaps ({totalGaps})
        </button>
        <button
          onClick={() => setFilter('conflicts')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'conflicts' ? 'bg-severity-major text-white' : 'bg-surface-2 text-text-secondary hover:text-white'
          }`}
        >
          Conflitos ({totalConflicts})
        </button>
        <button
          onClick={fetchData}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-text-secondary hover:text-white transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* Sections */}
      {data.sections.map(section => {
        const isExpanded = expandedSection === section.id;
        let filteredScenarios = section.scenarios;
        if (filter === 'gaps') {
          filteredScenarios = section.scenarios.filter(s => section.gaps.includes(s.id));
        } else if (filter === 'conflicts') {
          filteredScenarios = section.scenarios.filter(s => section.conflicts.includes(s.id));
        }

        if (filter !== 'all' && filteredScenarios.length === 0) return null;

        return (
          <div key={section.id} className="bg-surface-2 border border-surface-3 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedSection(isExpanded ? null : section.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{section.title}</span>
                <span className="text-xs text-text-muted">{section.coverage}% cobertura</span>
                {section.gaps.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-severity-blocker/20 text-severity-blocker">
                    {section.gaps.length} gap(s)
                  </span>
                )}
                {section.conflicts.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-severity-major/20 text-severity-major">
                    {section.conflicts.length} conflito(s)
                  </span>
                )}
              </div>
              <span className={`text-text-muted text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isExpanded && filteredScenarios.length > 0 && (
              <div className="border-t border-surface-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-3">
                      <th className="text-left px-4 py-2 text-xs font-medium text-text-muted min-w-[200px]">Cenário</th>
                      {data.participants.map(p => (
                        <th key={p.userId} className="text-center px-2 py-2 text-xs font-medium text-text-muted min-w-[80px]">
                          {p.userName.split(' ')[0]}
                        </th>
                      ))}
                      <th className="text-center px-2 py-2 text-xs font-medium text-text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScenarios.map(scenario => {
                      const isGap = section.gaps.includes(scenario.id);
                      const isConflict = section.conflicts.includes(scenario.id);
                      return (
                        <tr key={scenario.id} className={`border-b border-surface-3 last:border-0 ${
                          isGap ? 'bg-severity-blocker/5' : isConflict ? 'bg-severity-major/5' : ''
                        }`}>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-text-primary text-xs">{scenario.title}</span>
                              {scenario.persona && (
                                <span className="px-1 py-0.5 rounded text-[9px] font-medium bg-primary-600/20 text-primary-400">
                                  {scenario.persona}
                                </span>
                              )}
                            </div>
                          </td>
                          {data.participants.map(p => {
                            const status = section.matrix[scenario.id]?.[p.userId] || 'not_started';
                            return (
                              <td key={p.userId} className="text-center px-2 py-2">
                                <div
                                  className="w-6 h-6 rounded mx-auto flex items-center justify-center text-xs"
                                  style={{
                                    backgroundColor: status === 'not_started' ? 'var(--color-surface-3)' : `${statusColors[status]}20`,
                                    color: statusColors[status],
                                  }}
                                  title={`${p.userName}: ${statusLabels[status] || 'Não testado'}`}
                                >
                                  {status === 'pass' ? '✓' :
                                   status === 'fail' ? '✗' :
                                   status === 'partial' ? '◐' :
                                   status === 'blocked' ? '⊘' :
                                   status === 'skipped' ? '⏭' : '·'}
                                </div>
                              </td>
                            );
                          })}
                          <td className="text-center px-2 py-2">
                            {isGap && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-severity-blocker/20 text-severity-blocker">GAP</span>
                            )}
                            {isConflict && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-severity-major/20 text-severity-major">CONFLITO</span>
                            )}
                            {!isGap && !isConflict && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-severity-enhancement/20 text-severity-enhancement">OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-muted pt-2">
        <span className="font-medium">Legenda:</span>
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: `${statusColors[status]}40` }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
