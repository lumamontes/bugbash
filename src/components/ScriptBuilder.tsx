import { useState, useEffect, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

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
}

interface ScriptBuilderProps {
  sessionId: string;
  scriptId: string;
  scriptTitle: string;
  initialSections: Section[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  draft: 'Rascunho',
  not_ready: 'Não pronta',
};

const statusColors: Record<string, string> = {
  active: 'bg-severity-enhancement/20 text-severity-enhancement',
  draft: 'bg-severity-minor/20 text-severity-minor',
  not_ready: 'bg-severity-blocker/20 text-severity-blocker',
};

// ── Toast Component ──────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg shadow-lg max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">{message}</p>
        <button onClick={onClose} className="text-red-400 hover:text-red-200 text-lg leading-none">&times;</button>
      </div>
    </div>
  );
}

// ── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({
  sessionId,
  scriptId,
  onClose,
  onImported,
  onError,
}: {
  sessionId: string;
  scriptId: string;
  onClose: () => void;
  onImported: () => void;
  onError: (msg: string) => void;
}) {
  const [format, setFormat] = useState<'markdown' | 'csv'>('markdown');
  const [content, setContent] = useState('');
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    if (!content.trim()) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/scripts/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, content, scriptId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao importar');
      }
      onImported();
      onClose();
    } catch (err: any) {
      onError(err.message || 'Erro ao importar roteiro');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-surface-1 border border-surface-3 rounded-lg w-full max-w-2xl mx-4 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-surface-3">
          <h3 className="text-lg font-semibold text-text-primary">Importar Roteiro</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Formato</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'markdown' | 'csv')}
              className="w-full px-3 py-2 bg-surface-1 border border-surface-3 text-text-primary rounded-lg focus:border-primary-500 focus:outline-none"
            >
              <option value="markdown">Markdown</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Conteudo</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 bg-surface-1 border border-surface-3 text-text-primary rounded-lg focus:border-primary-500 focus:outline-none resize-none font-mono text-sm"
              placeholder={
                format === 'markdown'
                  ? '## Nome da Seção\n- Cenário 1\n- Cenário 2\n\n## Outra Seção\n- Cenário 3'
                  : 'section,title,precondition,steps,expected_result,persona\nLogin,Teste básico,Usuário cadastrado,Acessar página,Redirecionar ao dashboard,Admin'
              }
            />
          </div>
          <div className="text-xs text-text-muted">
            {format === 'markdown'
              ? 'Use ## para seções e - para cenários dentro de cada seção.'
              : 'Colunas obrigatórias: section, title. Opcionais: precondition, steps, expected_result, persona.'}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-3 hover:bg-surface-2 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !content.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {importing ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section Form ─────────────────────────────────────────────────────────────

function SectionForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: { title: string; description: string; status: string; notReadyReason: string };
  onSubmit: (data: { title: string; description: string; status: string; notReadyReason: string }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [notReadyReason, setNotReadyReason] = useState(initial?.notReadyReason ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description, status, notReadyReason });
  }

  const inputClass = 'w-full px-3 py-2 bg-surface-1 border border-surface-3 text-text-primary rounded-lg focus:border-primary-500 focus:outline-none text-sm';

  return (
    <form onSubmit={handleSubmit} className="bg-surface-1 border border-surface-3 rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Titulo *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Nome da seção"
          required
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} resize-none`}
          rows={2}
          placeholder="Descrição opcional da seção"
        />
      </div>
      {initial && (
        <>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="active">Ativa</option>
              <option value="draft">Rascunho</option>
              <option value="not_ready">Não pronta</option>
            </select>
          </div>
          {status === 'not_ready' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Motivo</label>
              <input
                type="text"
                value={notReadyReason}
                onChange={(e) => setNotReadyReason(e.target.value)}
                className={inputClass}
                placeholder="Por que a seção não está pronta?"
              />
            </div>
          )}
        </>
      )}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-lg transition-colors"
        >
          {loading ? 'Salvando...' : initial ? 'Salvar' : 'Adicionar Seção'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-3 hover:bg-surface-2 rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Scenario Form ────────────────────────────────────────────────────────────

function ScenarioForm({
  initial,
  allScenarios,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Scenario;
  allScenarios: { id: string; title: string; sectionTitle: string }[];
  onSubmit: (data: Omit<Scenario, 'id' | 'sortOrder'>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [precondition, setPrecondition] = useState(initial?.precondition ?? '');
  const [stepsToExecute, setStepsToExecute] = useState(initial?.stepsToExecute ?? '');
  const [expectedResult, setExpectedResult] = useState(initial?.expectedResult ?? '');
  const [keyRules, setKeyRules] = useState(initial?.keyRules ?? '');
  const [persona, setPersona] = useState(initial?.persona ?? '');
  const [dependsOn, setDependsOn] = useState(initial?.dependsOn ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title,
      precondition: precondition || null,
      stepsToExecute: stepsToExecute || null,
      expectedResult: expectedResult || null,
      keyRules: keyRules || null,
      persona: persona || null,
      dependsOn: dependsOn || null,
    });
  }

  const inputClass = 'w-full px-3 py-2 bg-surface-1 border border-surface-3 text-text-primary rounded-lg focus:border-primary-500 focus:outline-none text-sm';

  return (
    <form onSubmit={handleSubmit} className="bg-surface-0 border border-surface-3 rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Titulo *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Nome do cenário"
          required
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Pré-condição</label>
          <input
            type="text"
            value={precondition ?? ''}
            onChange={(e) => setPrecondition(e.target.value)}
            className={inputClass}
            placeholder="Estado inicial necessário"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Persona</label>
          <input
            type="text"
            value={persona ?? ''}
            onChange={(e) => setPersona(e.target.value)}
            className={inputClass}
            placeholder="Ex: Admin, Usuário final"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Passos para Executar</label>
        <textarea
          value={stepsToExecute ?? ''}
          onChange={(e) => setStepsToExecute(e.target.value)}
          className={`${inputClass} resize-none`}
          rows={3}
          placeholder="1. Fazer isso&#10;2. Fazer aquilo&#10;3. Verificar resultado"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Resultado Esperado</label>
        <textarea
          value={expectedResult ?? ''}
          onChange={(e) => setExpectedResult(e.target.value)}
          className={`${inputClass} resize-none`}
          rows={2}
          placeholder="O que deve acontecer ao executar os passos"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Regras Chave</label>
          <input
            type="text"
            value={keyRules ?? ''}
            onChange={(e) => setKeyRules(e.target.value)}
            className={inputClass}
            placeholder="Regras de negócio relevantes"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Depende de</label>
          <select
            value={dependsOn ?? ''}
            onChange={(e) => setDependsOn(e.target.value)}
            className={inputClass}
          >
            <option value="">Nenhum</option>
            {allScenarios
              .filter((s) => s.id !== initial?.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sectionTitle} &rarr; {s.title}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-lg transition-colors"
        >
          {loading ? 'Salvando...' : initial ? 'Salvar' : 'Adicionar Cenário'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-3 hover:bg-surface-2 rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Scenario Card ────────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  sectionId,
  sessionId,
  allScenarios,
  onUpdated,
  onDeleted,
  onError,
}: {
  scenario: Scenario;
  sectionId: string;
  sessionId: string;
  allScenarios: { id: string; title: string; sectionTitle: string }[];
  onUpdated: (s: Scenario) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleUpdate(data: Omit<Scenario, 'id' | 'sortOrder'>) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/sections/${sectionId}/scenarios/${scenario.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error('Erro ao atualizar cenário');
      const updated = await res.json();
      onUpdated({ ...updated, sortOrder: updated.sortOrder ?? scenario.sortOrder });
      setEditing(false);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/sections/${sectionId}/scenarios/${scenario.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Erro ao excluir cenário');
      onDeleted(scenario.id);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  }

  if (editing) {
    return (
      <ScenarioForm
        initial={scenario}
        allScenarios={allScenarios}
        onSubmit={handleUpdate}
        onCancel={() => setEditing(false)}
        loading={loading}
      />
    );
  }

  return (
    <div className="bg-surface-0 border border-surface-3 rounded-lg">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-surface-1/50 transition-colors rounded-lg"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-text-primary truncate">{scenario.title}</span>
          {scenario.persona && (
            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-600/20 text-primary-400">
              {scenario.persona}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-2 py-1 text-xs font-medium text-red-300 bg-red-900 hover:bg-red-800 rounded transition-colors"
              >
                {loading ? '...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium text-text-secondary bg-surface-3 hover:bg-surface-2 rounded transition-colors"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
              title="Excluir"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-surface-3/50">
          {scenario.precondition && (
            <div>
              <span className="text-xs font-medium text-text-muted">Pré-condição:</span>
              <p className="text-sm text-text-secondary mt-0.5">{scenario.precondition}</p>
            </div>
          )}
          {scenario.stepsToExecute && (
            <div>
              <span className="text-xs font-medium text-text-muted">Passos:</span>
              <p className="text-sm text-text-secondary mt-0.5 whitespace-pre-line">{scenario.stepsToExecute}</p>
            </div>
          )}
          {scenario.expectedResult && (
            <div>
              <span className="text-xs font-medium text-text-muted">Resultado Esperado:</span>
              <p className="text-sm text-text-secondary mt-0.5 whitespace-pre-line">{scenario.expectedResult}</p>
            </div>
          )}
          {scenario.keyRules && (
            <div>
              <span className="text-xs font-medium text-text-muted">Regras Chave:</span>
              <p className="text-sm text-text-secondary mt-0.5">{scenario.keyRules}</p>
            </div>
          )}
          {scenario.dependsOn && (
            <div>
              <span className="text-xs font-medium text-text-muted">Depende de:</span>
              <p className="text-sm text-text-secondary mt-0.5">
                {allScenarios.find((s) => s.id === scenario.dependsOn)?.title ?? scenario.dependsOn}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section Accordion ────────────────────────────────────────────────────────

function SectionAccordion({
  section,
  sessionId,
  scriptId,
  allScenarios,
  onSectionUpdated,
  onSectionDeleted,
  onScenarioAdded,
  onScenarioUpdated,
  onScenarioDeleted,
  onError,
}: {
  section: Section;
  sessionId: string;
  scriptId: string;
  allScenarios: { id: string; title: string; sectionTitle: string }[];
  onSectionUpdated: (s: Section) => void;
  onSectionDeleted: (id: string) => void;
  onScenarioAdded: (sectionId: string, scenario: Scenario) => void;
  onScenarioUpdated: (sectionId: string, scenario: Scenario) => void;
  onScenarioDeleted: (sectionId: string, scenarioId: string) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editingSection, setEditingSection] = useState(false);
  const [addingScenario, setAddingScenario] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleUpdateSection(data: {
    title: string;
    description: string;
    status: string;
    notReadyReason: string;
  }) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/sections/${section.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar seção');
      const updated = await res.json();
      onSectionUpdated({
        ...updated,
        scenarios: section.scenarios,
        sortOrder: updated.sortOrder ?? section.sortOrder,
      });
      setEditingSection(false);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSection() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/sections/${section.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir seção');
      onSectionDeleted(section.id);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  }

  async function handleAddScenario(data: Omit<Scenario, 'id' | 'sortOrder'>) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/sections/${section.id}/scenarios`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error('Erro ao adicionar cenário');
      const result = await res.json();
      const newScenario: Scenario = {
        id: result.id,
        ...data,
        sortOrder: section.scenarios.length,
      };
      onScenarioAdded(section.id, newScenario);
      setAddingScenario(false);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (editingSection) {
    return (
      <SectionForm
        initial={{
          title: section.title,
          description: section.description ?? '',
          status: section.status,
          notReadyReason: section.notReadyReason ?? '',
        }}
        onSubmit={handleUpdateSection}
        onCancel={() => setEditingSection(false)}
        loading={loading}
      />
    );
  }

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-lg">
      {/* Section Header */}
      <div className="flex items-center justify-between p-4">
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
          onClick={() => setOpen(!open)}
        >
          <svg
            className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <h3 className="text-base font-semibold text-text-primary truncate">{section.title}</h3>
          <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[section.status]}`}>
            {statusLabels[section.status]}
          </span>
          <span className="text-xs text-text-muted flex-shrink-0">
            {section.scenarios.length} {section.scenarios.length === 1 ? 'cenário' : 'cenários'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setEditingSection(true)}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
            title="Editar seção"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDeleteSection}
                disabled={loading}
                className="px-2 py-1 text-xs font-medium text-red-300 bg-red-900 hover:bg-red-800 rounded transition-colors"
              >
                {loading ? '...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium text-text-secondary bg-surface-3 hover:bg-surface-2 rounded transition-colors"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
              title="Excluir seção"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Section description */}
      {open && section.description && (
        <div className="px-4 pb-2">
          <p className="text-sm text-text-muted">{section.description}</p>
        </div>
      )}

      {/* Not ready reason */}
      {open && section.status === 'not_ready' && section.notReadyReason && (
        <div className="mx-4 mb-3 px-3 py-2 bg-red-900/20 border border-red-900/40 rounded-lg">
          <p className="text-xs text-red-300">{section.notReadyReason}</p>
        </div>
      )}

      {/* Scenarios List */}
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {section.scenarios.length === 0 && !addingScenario && (
            <p className="text-sm text-text-muted py-2">Nenhum cenário nesta seção.</p>
          )}
          {section.scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              sectionId={section.id}
              sessionId={sessionId}
              allScenarios={allScenarios}
              onUpdated={(updated) => onScenarioUpdated(section.id, updated)}
              onDeleted={(id) => onScenarioDeleted(section.id, id)}
              onError={onError}
            />
          ))}
          {addingScenario ? (
            <ScenarioForm
              allScenarios={allScenarios}
              onSubmit={handleAddScenario}
              onCancel={() => setAddingScenario(false)}
              loading={loading}
            />
          ) : (
            <button
              onClick={() => setAddingScenario(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface-3/50 rounded-lg transition-colors w-full"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Cenário
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ScriptBuilder Component ─────────────────────────────────────────────

export default function ScriptBuilder({
  sessionId,
  scriptId,
  scriptTitle,
  initialSections,
}: ScriptBuilderProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [addingSection, setAddingSection] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Flat list of all scenarios for dependency dropdowns
  const allScenarios = sections.flatMap((section) =>
    section.scenarios.map((s) => ({
      id: s.id,
      title: s.title,
      sectionTitle: section.title,
    }))
  );

  function showError(msg: string) {
    setToast(msg);
  }

  async function handleAddSection(data: {
    title: string;
    description: string;
    status: string;
    notReadyReason: string;
  }) {
    setSectionLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId,
          title: data.title,
          description: data.description || null,
        }),
      });
      if (!res.ok) throw new Error('Erro ao criar seção');
      const result = await res.json();
      const newSection: Section = {
        id: result.id,
        title: data.title,
        description: data.description || null,
        status: 'active',
        notReadyReason: null,
        scenarios: [],
        sortOrder: sections.length,
      };
      setSections((prev) => [...prev, newSection]);
      setAddingSection(false);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSectionLoading(false);
    }
  }

  function handleSectionUpdated(updated: Section) {
    setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleSectionDeleted(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function handleScenarioAdded(sectionId: string, scenario: Scenario) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, scenarios: [...s.scenarios, scenario] } : s
      )
    );
  }

  function handleScenarioUpdated(sectionId: string, scenario: Scenario) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, scenarios: s.scenarios.map((sc) => (sc.id === scenario.id ? scenario : sc)) }
          : s
      )
    );
  }

  function handleScenarioDeleted(sectionId: string, scenarioId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, scenarios: s.scenarios.filter((sc) => sc.id !== scenarioId) }
          : s
      )
    );
  }

  async function handleImported() {
    // Reload all sections from server
    try {
      const res = await fetch(`/api/sessions/${sessionId}/sections`);
      if (!res.ok) throw new Error('Erro ao recarregar seções');
      const data: (Section & { scriptTitle?: string })[] = await res.json();
      // The GET endpoint returns sections with scriptTitle; normalize
      const normalized = data.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status as 'active' | 'draft' | 'not_ready',
        notReadyReason: s.notReadyReason,
        scenarios: s.scenarios ?? [],
        sortOrder: s.sortOrder,
      }));
      setSections(normalized);
    } catch (err: any) {
      showError(err.message);
    }
  }

  const totalScenarios = sections.reduce((acc, s) => acc + s.scenarios.length, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-surface-1 border border-surface-3 rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-2xl font-bold text-text-primary">{sections.length}</span>
            <span className="text-sm text-text-muted ml-1.5">{sections.length === 1 ? 'seção' : 'seções'}</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-text-primary">{totalScenarios}</span>
            <span className="text-sm text-text-muted ml-1.5">{totalScenarios === 1 ? 'cenário' : 'cenários'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-3 hover:bg-surface-2 rounded-lg transition-colors"
          >
            Importar
          </button>
          <button
            onClick={() => setAddingSection(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
          >
            + Nova Seção
          </button>
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-3">
        {sections.map((section) => (
          <SectionAccordion
            key={section.id}
            section={section}
            sessionId={sessionId}
            scriptId={scriptId}
            allScenarios={allScenarios}
            onSectionUpdated={handleSectionUpdated}
            onSectionDeleted={handleSectionDeleted}
            onScenarioAdded={handleScenarioAdded}
            onScenarioUpdated={handleScenarioUpdated}
            onScenarioDeleted={handleScenarioDeleted}
            onError={showError}
          />
        ))}
      </div>

      {/* Add section form */}
      {addingSection && (
        <SectionForm
          onSubmit={handleAddSection}
          onCancel={() => setAddingSection(false)}
          loading={sectionLoading}
        />
      )}

      {/* Empty state */}
      {sections.length === 0 && !addingSection && (
        <div className="text-center py-12 bg-surface-1 border border-surface-3 rounded-lg">
          <img
            src="https://cdn.arcotech.io/iris-ds/illustrations/arcotech/empty-state/empty-state-generico.svg"
            alt=""
            className="w-40 h-auto mx-auto mb-4"
          />
          <h3 className="text-lg font-medium text-text-secondary mb-2">Nenhuma seção criada</h3>
          <p className="text-sm text-text-muted mb-4">
            Comece adicionando seções e cenários ao roteiro de teste, ou importe de um arquivo.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-3 hover:bg-surface-2 rounded-lg transition-colors"
            >
              Importar
            </button>
            <button
              onClick={() => setAddingSection(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
            >
              + Nova Seção
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          sessionId={sessionId}
          scriptId={scriptId}
          onClose={() => setShowImport(false)}
          onImported={handleImported}
          onError={showError}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
