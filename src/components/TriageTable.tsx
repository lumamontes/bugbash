import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $session } from '../stores/sessionStore';

interface Bug {
  id: string;
  title: string;
  severity: string;
  status: string;
  reporterName: string;
  createdAt: string;
  linearIssueId?: string | null;
  linearIssueUrl?: string | null;
}

interface Props {
  bugs: Bug[];
}

const severityOptions = [
  { value: 'blocker', label: 'Bloqueante', color: 'var(--color-severity-blocker)' },
  { value: 'major', label: 'Grave', color: 'var(--color-severity-major)' },
  { value: 'minor', label: 'Menor', color: 'var(--color-severity-minor)' },
  { value: 'enhancement', label: 'Melhoria', color: 'var(--color-severity-enhancement)' },
];

const statusOptions = [
  { value: 'open', label: 'Aberto' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'fixed', label: 'Corrigido' },
  { value: 'wontfix', label: 'Não Corrigir' },
  { value: 'duplicate', label: 'Duplicado' },
];

export default function TriageTable({ bugs: initialBugs }: Props) {
  const { id: sessionId } = useStore($session);
  const [bugs, setBugs] = useState(initialBugs);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSeverity, setBulkSeverity] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === bugs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(bugs.map(b => b.id)));
    }
  }

  async function updateBug(bugId: string, field: 'severity' | 'status', value: string) {
    setLoading(prev => ({ ...prev, [bugId]: true }));
    try {
      if (field === 'status') {
        await fetch(`/api/sessions/${sessionId}/bugs/${bugId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: value }),
        });
      } else {
        await fetch(`/api/sessions/${sessionId}/bugs/${bugId}/severity`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ severity: value }),
        });
      }
      setBugs(prev => prev.map(b => b.id === bugId ? { ...b, [field]: value } : b));
    } finally {
      setLoading(prev => ({ ...prev, [bugId]: false }));
    }
  }

  async function applyBulk() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    for (const id of ids) {
      if (bulkSeverity) await updateBug(id, 'severity', bulkSeverity);
      if (bulkStatus) await updateBug(id, 'status', bulkStatus);
    }
    setBulkSeverity('');
    setBulkStatus('');
    setSelected(new Set());
  }

  const selectClass = 'px-2 py-1 bg-surface-2 border border-surface-3 rounded text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500';

  return (
    <div>
      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
          <span className="text-xs text-primary-400 font-medium">{selected.size} selecionado(s)</span>
          <select value={bulkSeverity} onChange={e => setBulkSeverity(e.target.value)} className={selectClass}>
            <option value="">Severidade...</option>
            {severityOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className={selectClass}>
            <option value="">Status...</option>
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={applyBulk}
            disabled={!bulkSeverity && !bulkStatus}
            className="px-3 py-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
          >
            Aplicar
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-3">
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === bugs.length && bugs.length > 0}
                  onChange={toggleAll}
                  className="rounded border-surface-3 bg-surface-2 text-primary-500 focus:ring-primary-500"
                />
              </th>
              <th className="text-left px-3 py-2 text-text-muted font-medium text-xs">Título</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium text-xs w-36">Severidade</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium text-xs w-36">Status</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium text-xs">Reporter</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium text-xs w-28">Linear</th>
            </tr>
          </thead>
          <tbody>
            {bugs.map(bug => (
              <tr key={bug.id} className={`border-b border-surface-3 last:border-0 ${selected.has(bug.id) ? 'bg-primary-500/5' : 'hover:bg-surface-2'} transition-colors`}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(bug.id)}
                    onChange={() => toggleSelect(bug.id)}
                    className="rounded border-surface-3 bg-surface-2 text-primary-500 focus:ring-primary-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <a
                    href={`/sessions/${sessionId}/bugs/${bug.id}`}
                    className="text-text-primary hover:text-primary-400 font-medium"
                  >
                    {bug.title}
                  </a>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={bug.severity}
                    onChange={e => updateBug(bug.id, 'severity', e.target.value)}
                    disabled={loading[bug.id]}
                    className={selectClass}
                    style={{ color: severityOptions.find(s => s.value === bug.severity)?.color }}
                  >
                    {severityOptions.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={bug.status}
                    onChange={e => updateBug(bug.id, 'status', e.target.value)}
                    disabled={loading[bug.id]}
                    className={selectClass}
                  >
                    {statusOptions.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-text-secondary text-xs">{bug.reporterName}</td>
                <td className="px-3 py-2">
                  {bug.linearIssueUrl ? (
                    <a
                      href={bug.linearIssueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5e6ad2] hover:text-primary-400 text-xs font-medium"
                    >
                      {bug.linearIssueId}
                    </a>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
