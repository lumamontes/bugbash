import { useState } from 'react';

interface Props {
  sessionId: string;
  bugId: string;
  bugTitle: string;
  linearIssueId?: string | null;
  linearIssueUrl?: string | null;
}

type Tab = 'original' | 'suggested';

interface PreviewData {
  title: string;
  description: string;
}

export default function LinearExportModal({
  bugId,
  bugTitle,
  linearIssueId,
  linearIssueUrl,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab] = useState<Tab>('suggested');
  const [original, setOriginal] = useState<PreviewData | null>(null);
  const [suggested, setSuggested] = useState<PreviewData | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [exported, setExported] = useState<{ issueId: string; issueUrl: string } | null>(
    linearIssueId && linearIssueUrl ? { issueId: linearIssueId, issueUrl: linearIssueUrl } : null,
  );

  async function openModal() {
    setIsOpen(true);
    setLoading(true);

    try {
      const res = await fetch('/api/linear/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bugId }),
      });
      const data = await res.json();
      setOriginal(data.original);
      setSuggested(data.suggested);
      setEditTitle(data.suggested.title);
      setEditDescription(data.suggested.description);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    if (t === 'original' && original) {
      setEditTitle(original.title);
      setEditDescription(original.description);
    } else if (t === 'suggested' && suggested) {
      setEditTitle(suggested.title);
      setEditDescription(suggested.description);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/linear/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bugId, title: editTitle, description: editDescription }),
      });

      if (res.ok) {
        const result = await res.json();
        setExported(result);
        setIsOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  // Already exported — show link
  if (exported) {
    return (
      <a
        href={exported.issueUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-3 py-1.5 bg-[#5e6ad2]/20 text-[#5e6ad2] text-xs font-medium rounded-lg hover:bg-[#5e6ad2]/30 transition-colors"
      >
        Ver no Linear ({exported.issueId})
      </a>
    );
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center px-3 py-1.5 bg-surface-2 border border-surface-3 text-text-primary text-xs font-medium rounded-lg hover:bg-surface-3 transition-colors"
      >
        Exportar para Linear
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setIsOpen(false)}>
          <div
            className="bg-surface-1 border border-surface-3 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
              <h2 className="text-sm font-semibold text-text-primary">Exportar para Linear</h2>
              <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <div className="space-y-3 w-full max-w-md px-6">
                  <div className="h-4 bg-surface-3 rounded animate-pulse" />
                  <div className="h-4 bg-surface-3 rounded animate-pulse w-3/4" />
                  <div className="h-20 bg-surface-3 rounded animate-pulse mt-4" />
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex border-b border-surface-3">
                  <button
                    onClick={() => switchTab('suggested')}
                    className={`px-6 py-2.5 text-xs font-medium transition-colors ${
                      tab === 'suggested'
                        ? 'text-primary-400 border-b-2 border-primary-500'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    AI Sugerido
                  </button>
                  <button
                    onClick={() => switchTab('original')}
                    className={`px-6 py-2.5 text-xs font-medium transition-colors ${
                      tab === 'original'
                        ? 'text-primary-400 border-b-2 border-primary-500'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Original
                  </button>
                </div>

                {/* Editable fields */}
                <div className="flex-1 overflow-auto p-6 space-y-4">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Título</label>
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Descrição (Markdown)</label>
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={exporting || !editTitle}
                    className="px-4 py-2 bg-[#5e6ad2] hover:bg-primary-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {exporting ? 'Exportando...' : 'Exportar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
