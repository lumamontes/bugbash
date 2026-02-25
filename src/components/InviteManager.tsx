import { useState, useEffect } from 'react';

interface Invite {
  id: string;
  code: string;
  role: string;
  maxUses: number;
  timesUsed: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  facilitator: 'Facilitador',
  participant: 'Participante',
};

export default function InviteManager() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState<string>('participant');
  const [maxUses, setMaxUses] = useState<number>(0);
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites();
  }, []);

  async function fetchInvites() {
    const res = await fetch('/api/invites');
    if (res.ok) {
      const data = await res.json();
      setInvites(data);
    }
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, maxUses, expiresInDays }),
    });

    if (res.ok) {
      await fetchInvites();
    }
    setCreating(false);
  }

  async function handleDeactivate(id: string) {
    await fetch(`/api/invites/${id}`, { method: 'DELETE' });
    await fetchInvites();
  }

  function getInviteUrl(code: string) {
    return `${window.location.origin}/convite/${code}`;
  }

  function copyToClipboard(code: string, id: string) {
    navigator.clipboard.writeText(getInviteUrl(code));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const activeInvites = invites.filter(i => i.isActive);
  const inactiveInvites = invites.filter(i => !i.isActive);

  if (loading) {
    return <p className="text-text-muted text-sm py-4">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg bg-surface-2">
        <div>
          <label className="block text-xs text-text-muted font-medium mb-1">Papel</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-600"
          >
            <option value="participant">Participante</option>
            <option value="facilitator">Facilitador</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-text-muted font-medium mb-1">Usos máximos</label>
          <input
            type="number"
            min="0"
            value={maxUses}
            onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
            className="w-24 px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="0 = ilimitado"
          />
          <span className="text-xs text-text-muted ml-1">0 = ilimitado</span>
        </div>

        <div>
          <label className="block text-xs text-text-muted font-medium mb-1">Expira em (dias)</label>
          <input
            type="number"
            min="1"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
            className="w-20 px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-600"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {creating ? 'Criando...' : 'Gerar link'}
        </button>
      </div>

      {/* Active invites */}
      {activeInvites.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-4">Nenhum convite ativo.</p>
      ) : (
        <div className="space-y-2">
          {activeInvites.map(invite => (
            <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-primary-400">{invite.code}</code>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface-3 text-text-secondary">
                    {roleLabel[invite.role] ?? invite.role}
                  </span>
                  <span className="text-xs text-text-muted">
                    {invite.timesUsed}{invite.maxUses > 0 ? `/${invite.maxUses}` : ''} usos
                  </span>
                </div>
                {invite.expiresAt && (
                  <p className="text-xs text-text-muted mt-0.5">
                    Expira: {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3">
                <button
                  onClick={() => copyToClipboard(invite.code, invite.id)}
                  className="text-xs px-2 py-1 bg-surface-3 hover:bg-surface-0 text-text-secondary rounded transition-colors"
                >
                  {copiedId === invite.id ? 'Copiado!' : 'Copiar link'}
                </button>
                <button
                  onClick={() => handleDeactivate(invite.id)}
                  className="text-xs text-text-muted hover:text-red-400 transition-colors"
                >
                  Desativar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inactive invites */}
      {inactiveInvites.length > 0 && (
        <details className="text-sm">
          <summary className="text-text-muted cursor-pointer hover:text-text-secondary transition-colors">
            {inactiveInvites.length} convite{inactiveInvites.length !== 1 ? 's' : ''} inativo{inactiveInvites.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1">
            {inactiveInvites.map(invite => (
              <div key={invite.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-2 opacity-50">
                <code className="text-xs font-mono text-text-muted">{invite.code}</code>
                <span className="text-xs text-text-muted">{roleLabel[invite.role] ?? invite.role}</span>
                <span className="text-xs text-text-muted">{invite.timesUsed} usos</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
