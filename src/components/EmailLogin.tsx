import { useState, useEffect, useRef } from 'react';

interface UserResult {
  id: string;
  name: string;
  email: string;
}

export default function EmailLogin() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleLogin(email: string) {
    setLoggingIn(true);
    const form = new FormData();
    form.set('email', email);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: form,
      redirect: 'follow',
    });

    // Follow redirect
    if (res.redirected) {
      window.location.href = res.url;
    } else {
      window.location.href = '/';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      await handleLogin(query.trim());
    }
  }

  return (
    <div className="bg-surface-1 rounded-2xl border border-surface-3 p-6 space-y-4">
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="email"
            autoFocus
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="seu@email.com"
          />
        </div>

        {/* User cards */}
        {results.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {results.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleLogin(user.email)}
                disabled={loggingIn}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-2 hover:bg-surface-3 border border-surface-3 hover:border-primary-600 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400 font-medium text-sm shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && !loading && (
          <p className="mt-3 text-sm text-text-muted text-center py-2">Nenhum usuário encontrado.</p>
        )}

        {loading && (
          <p className="mt-3 text-sm text-text-muted text-center py-2">Buscando...</p>
        )}

        <button
          type="submit"
          disabled={!query.trim() || loggingIn}
          className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-1 disabled:opacity-50"
        >
          {loggingIn ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
