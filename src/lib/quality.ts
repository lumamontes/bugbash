export interface QualityInput {
  title: string;
  description: string;
  stepsToReproduce: string;
  severity: string;
  hasEvidence: boolean;
}

export interface QualityResult {
  score: number;
  warnings: string[];
}

export function computeQualityScore(input: QualityInput): QualityResult {
  let score = 0;
  const warnings: string[] = [];

  // Title present and > 10 chars: +15
  if (input.title && input.title.length > 10) {
    score += 15;
  } else if (input.title && input.title.length > 0) {
    score += 5;
    warnings.push('Título muito curto (mínimo 10 caracteres)');
  } else {
    warnings.push('Título obrigatório');
  }

  // Description present and > 30 chars: +20
  if (input.description && input.description.length > 30) {
    score += 20;
  } else if (input.description && input.description.length > 0) {
    score += 10;
    warnings.push('Descrição muito curta (mínimo 30 caracteres)');
  } else {
    warnings.push('Falta descrição do bug');
  }

  // Steps to reproduce present: +25
  if (input.stepsToReproduce && input.stepsToReproduce.length > 10) {
    score += 25;
  } else {
    warnings.push('Faltam passos para reproduzir');
  }

  // Severity selected: +15
  if (input.severity) {
    score += 15;
  }

  // Evidence attached: +15
  if (input.hasEvidence) {
    score += 15;
  } else {
    warnings.push('Nenhuma evidência anexada');
  }

  // Base points for filing a report: +10
  score += 10;

  return { score: Math.min(score, 100), warnings };
}
