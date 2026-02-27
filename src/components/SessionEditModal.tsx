import { useState } from 'react';

const phaseOrder = ['draft', 'scheduled', 'kickoff', 'execution', 'wrapup', 'closed'] as const;
const phaseLabels: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  kickoff: 'Kickoff',
  execution: 'Execução',
  wrapup: 'Encerramento',
  closed: 'Finalizada',
};

interface Props {
  session: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    scheduledAt: string | null;
    kickoffDuration: number | null;
    executionDuration: number | null;
    wrapupDuration: number | null;
  };
  isAdmin: boolean;
}

export default function SessionEditModal({ session, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(session.title);
  const [description, setDescription] = useState(session.description ?? '');
  const [scheduledAt, setScheduledAt] = useState(
    session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : '',
  );
  const [kickoffDuration, setKickoffDuration] = useState(session.kickoffDuration ?? 15);
  const [executionDuration, setExecutionDuration] = useState(session.executionDuration ?? 60);
  const [wrapupDuration, setWrapupDuration] = useState(session.wrapupDuration ?? 15);

  const currentIndex = phaseOrder.indexOf(session.status as any);
  const earlierPhases = phaseOrder.slice(0, currentIndex);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          scheduledAt: scheduledAt || null,
          kickoffDuration,
          executionDuration,
          wrapupDuration,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao salvar');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestart(targetStatus: string) {
    setRestarting(targetStatus);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart', targetStatus }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao reiniciar fase');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setRestarting(null);
      setConfirmRestart(null);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-surface-3 hover:bg-surface-3 text-text-secondary text-sm font-medium rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
        Editar
      </button>
    );
  }

  const inputClass = 'w-full px-3 py-2 bg-surface-1 border border-surface-3 rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-text-secondary mb-1';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-surface-3 hover:bg-surface-3 text-text-secondary text-sm font-medium rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
        Editar
      </button>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface-1 border border-surface-3 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
            <h2 className="text-lg font-semibold text-text-primary">Editar sessão</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Edit form */}
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Título</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Agendamento</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Kickoff (min)</label>
                  <input
                    type="number"
                    min={1}
                    value={kickoffDuration}
                    onChange={(e) => setKickoffDuration(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Execução (min)</label>
                  <input
                    type="number"
                    min={1}
                    value={executionDuration}
                    onChange={(e) => setExecutionDuration(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Encerramento (min)</label>
                  <input
                    type="number"
                    min={1}
                    value={wrapupDuration}
                    onChange={(e) => setWrapupDuration(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>

            {/* Phase restart — admin only, not in draft */}
            {isAdmin && earlierPhases.length > 0 && (
              <div className="pt-4 border-t border-surface-3">
                <h3 className="text-sm font-medium text-text-secondary mb-2">Reiniciar fase</h3>
                <p className="text-xs text-text-muted mb-3">
                  Voltar para uma fase anterior. Dados existentes (bugs, participantes) serão preservados.
                </p>
                <div className="space-y-2">
                  {earlierPhases.map((phase) => (
                    <div key={phase}>
                      {confirmRestart === phase ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-amber-400 flex-1">
                            Confirmar volta para {phaseLabels[phase]}?
                          </span>
                          <button
                            onClick={() => handleRestart(phase)}
                            disabled={!!restarting}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            {restarting === phase ? 'Voltando...' : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => setConfirmRestart(null)}
                            className="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-text-secondary text-xs font-medium rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRestart(phase)}
                          className="w-full text-left px-3 py-2 bg-surface-2 border border-surface-3 hover:bg-surface-3 text-text-secondary text-sm rounded-lg transition-colors"
                        >
                          Voltar para {phaseLabels[phase]}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
