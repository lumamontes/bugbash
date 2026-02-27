import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $session } from '../stores/sessionStore';

const transitions: Record<string, { next: string; label: string }> = {
  draft: { next: 'scheduled', label: 'Agendar' },
  scheduled: { next: 'kickoff', label: 'Iniciar Kickoff' },
  kickoff: { next: 'execution', label: 'Iniciar Execução' },
  execution: { next: 'wrapup', label: 'Iniciar Encerramento' },
  wrapup: { next: 'closed', label: 'Finalizar' },
};

export default function SessionStatusControl() {
  const session = useStore($session);
  const [loading, setLoading] = useState(false);
  const transition = transitions[session.status];

  if (!transition) return null;

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: transition!.next }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {loading ? 'Aguarde...' : transition.label}
    </button>
  );
}
