import { useState, useRef, useEffect } from 'react';
import type { QualityInput } from '@lib/quality';
import { computeQualityScore } from '@lib/quality';

interface TestStep {
  id: string;
  instruction: string;
  scriptTitle: string;
}

interface DuplicateMatch {
  id: string;
  title: string;
  severity: string;
  status: string;
}

interface ScenarioContext {
  scenarioId: string;
  scenarioTitle: string;
  sectionId: string;
  sectionTitle: string;
  precondition?: string;
  stepsToExecute?: string;
  expectedResult?: string;
}

interface Props {
  sessionId: string;
  testSteps: TestStep[];
  reportMode?: 'guided' | 'freeform';
  scenarioContext?: ScenarioContext | null;
  defaultType?: string;
  showQuality?: boolean;
}

const severityLabels: Record<string, string> = {
  blocker: 'Bloqueante',
  major: 'Grave',
  minor: 'Baixa',
  enhancement: 'Melhoria',
};

const severityColors: Record<string, string> = {
  blocker: '#ef4444',
  major: '#f97316',
  minor: '#eab308',
  enhancement: '#22c55e',
};

const statusLabels: Record<string, string> = {
  open: 'Aberto',
  confirmed: 'Confirmado',
  fixed: 'Corrigido',
  wontfix: 'Não Corrigir',
  duplicate: 'Duplicado',
};

export default function BugReportForm({ sessionId, testSteps, reportMode = 'freeform', scenarioContext, defaultType, showQuality = true }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState(
    scenarioContext?.stepsToExecute ? `Cenário: ${scenarioContext.scenarioTitle}\n${scenarioContext.stepsToExecute}` : ''
  );
  const [severity, setSeverity] = useState('minor');
  const [type, setType] = useState(defaultType || 'bug');
  const [testStepId, setTestStepId] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Quality score
  const qualityInput: QualityInput = {
    title,
    description,
    stepsToReproduce,
    severity,
    hasEvidence: evidenceFiles.length > 0,
  };
  const quality = computeQualityScore(qualityInput);

  // Duplicate detection on title change
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (title.length < 3) {
      setDuplicates([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/bugs/search?q=${encodeURIComponent(title)}`);
        if (res.ok) {
          const data = await res.json();
          setDuplicates(data);
        }
      } catch {}
    }, 300);
  }, [title, sessionId]);

  // Handle paste
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) addFile(file);
        }
      }
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  function addFile(file: File) {
    setEvidenceFiles(prev => [...prev, file]);
    const reader = new FileReader();
    reader.onload = () => setEvidencePreviews(prev => [...prev, reader.result as string]);
    reader.readAsDataURL(file);
  }

  function removeFile(index: number) {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
    setEvidencePreviews(prev => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    files.forEach(f => {
      if (f.type.startsWith('image/') || f.type.startsWith('video/')) addFile(f);
    });
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    try {
      // Create FormData for the bug
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('stepsToReproduce', stepsToReproduce);
      formData.append('severity', severity);
      formData.append('type', type);
      if (testStepId) formData.append('testStepId', testStepId);
      if (reportMode) formData.append('reportMode', reportMode);
      if (scenarioContext) {
        formData.append('testScenarioId', scenarioContext.scenarioId);
        formData.append('testSectionId', scenarioContext.sectionId);
      }
      const res = await fetch(`/api/sessions/${sessionId}/bugs`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        setSubmitting(false);
        return;
      }

      const { id: bugId } = await res.json();

      // Upload evidence files
      if (bugId && evidenceFiles.length > 0) {
        for (const file of evidenceFiles) {
          const evFormData = new FormData();
          evFormData.append('file', file);
          await fetch(`/api/sessions/${sessionId}/bugs/${bugId}/evidence`, {
            method: 'POST',
            body: evFormData,
          });
        }
      }

      window.location.href = `/sessions/${sessionId}/bugs/${bugId}`;
    } catch {
      setSubmitting(false);
    }
  }

  const scoreColor = quality.score >= 70 ? '#22c55e' : quality.score >= 40 ? '#eab308' : '#ef4444';

  const inputClass = 'w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-text-primary mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Scenario Context Block */}
      {scenarioContext && (
        <div className="bg-primary-600/10 border border-primary-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-primary-400">Cenário vinculado</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-600/20 text-primary-400">
              {scenarioContext.sectionTitle}
            </span>
          </div>
          <p className="text-sm font-medium text-text-primary">{scenarioContext.scenarioTitle}</p>
          {scenarioContext.expectedResult && (
            <p className="text-xs text-text-muted mt-1">Esperado: {scenarioContext.expectedResult}</p>
          )}
        </div>
      )}

      {/* Quality Score Bar — hidden from participants */}
      {showQuality && (
        <div className="bg-surface-2 border border-surface-3 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted">Qualidade do Reporte</span>
            <span className="text-sm font-bold" style={{ color: scoreColor }}>{quality.score}/100</span>
          </div>
          <div className="w-full bg-surface-3 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${quality.score}%`, backgroundColor: scoreColor }}
            />
          </div>
          {quality.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {quality.warnings.map((w, i) => (
                <p key={i} className="text-xs text-severity-minor">{w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <div>
        <label className={labelClass}>Título *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className={inputClass}
          placeholder="Descreva o bug de forma concisa"
        />
        {/* Duplicate detection */}
        {duplicates.length > 0 && (
          <div className="mt-2 bg-surface-2 border border-severity-minor/30 rounded-lg p-3">
            <p className="text-xs font-medium text-severity-minor mb-2">Possíveis duplicatas:</p>
            {duplicates.map(d => (
              <a
                key={d.id}
                href={`/sessions/${sessionId}/bugs/${d.id}`}
                target="_blank"
                rel="noopener"
                className="flex items-center justify-between py-1.5 text-xs hover:bg-surface-3 rounded px-2 -mx-1"
              >
                <span className="text-text-secondary truncate flex-1">{d.title}</span>
                <span
                  className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: `${severityColors[d.severity]}20`, color: severityColors[d.severity] }}
                >
                  {severityLabels[d.severity]}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Descrição</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="Detalhes sobre o bug..."
        />
      </div>

      {/* Steps to Reproduce */}
      <div>
        <label className={labelClass}>Passos para Reproduzir</label>
        <textarea
          value={stepsToReproduce}
          onChange={e => setStepsToReproduce(e.target.value)}
          rows={4}
          className={`${inputClass} resize-none`}
          placeholder={"1. Acessar a página X\n2. Clicar no botão Y\n3. Observar o erro Z"}
        />
      </div>

      {/* Severity + Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Severidade *</label>
          <div className="grid grid-cols-2 gap-2">
            {(['blocker', 'major', 'minor', 'enhancement'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  severity === s
                    ? 'border-current scale-105'
                    : 'border-surface-3 opacity-60 hover:opacity-80'
                }`}
                style={{ color: severityColors[s], backgroundColor: `${severityColors[s]}15` }}
              >
                {severityLabels[s]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Tipo</label>
          <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
            <option value="bug">Bug</option>
            <option value="improvement">Melhoria</option>
            <option value="ux_insight">Insight UX</option>
          </select>
        </div>
      </div>

      {/* Evidence drop zone */}
      <div>
        <label className={labelClass}>Evidências</label>
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-surface-3 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500/50 transition-colors"
        >
          <p className="text-sm text-text-muted">
            Arraste imagens aqui, cole do clipboard (Ctrl+V) ou clique para selecionar
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={e => {
              const files = Array.from(e.target.files || []);
              files.forEach(f => addFile(f));
              e.target.value = '';
            }}
          />
        </div>
        {evidencePreviews.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {evidencePreviews.map((preview, i) => (
              <div key={i} className="relative group">
                <img src={preview} alt="Evidência" className="w-24 h-24 object-cover rounded-lg border border-surface-3" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-severity-blocker rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked test step */}
      {testSteps.length > 0 && (
        <div>
          <label className={labelClass}>Passo de Teste Relacionado</label>
          <select value={testStepId} onChange={e => setTestStepId(e.target.value)} className={inputClass}>
            <option value="">Nenhum</option>
            {testSteps.map(s => (
              <option key={s.id} value={s.id}>{s.scriptTitle}: {s.instruction}</option>
            ))}
          </select>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? 'Enviando...' : 'Reportar Bug'}
        </button>
        <a href={`/sessions/${sessionId}`} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
          Cancelar
        </a>
      </div>
    </form>
  );
}
