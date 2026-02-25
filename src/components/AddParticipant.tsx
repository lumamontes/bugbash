import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Props {
  sessionId: string;
}

export default function AddParticipant({ sessionId }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && users.length === 0) {
      fetch('/api/users')
        .then(r => r.json())
        .then(data => setUsers(data))
        .catch(() => {});
    }
  }, [open]);

  async function handleAdd() {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-primary-400 hover:text-primary-300"
      >
        Adicionar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedUserId}
        onChange={e => setSelectedUserId(e.target.value)}
        className="px-2 py-1.5 bg-surface-2 border border-surface-3 rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="">Selecionar...</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        disabled={!selectedUserId || loading}
        className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm rounded transition-colors"
      >
        {loading ? '...' : 'Adicionar'}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-sm text-text-muted hover:text-text-primary"
      >
        Cancelar
      </button>
    </div>
  );
}
