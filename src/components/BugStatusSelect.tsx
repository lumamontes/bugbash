import { useState } from 'react';

const statuses = [
  { value: 'open', label: 'Aberto' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'fixed', label: 'Corrigido' },
  { value: 'wontfix', label: 'Não Corrigir' },
  { value: 'duplicate', label: 'Duplicado' },
];

interface Props {
  sessionId: string;
  bugId: string;
  currentStatus: string;
}

export default function BugStatusSelect({ sessionId, bugId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleChange(newStatus: string) {
    if (newStatus === status) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/bugs/${bugId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={status}
      onChange={e => handleChange(e.target.value)}
      disabled={loading}
      className="px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
    >
      {statuses.map(s => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}
