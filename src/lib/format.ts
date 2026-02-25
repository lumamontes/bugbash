const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

export function formatDate(date: Date | string | number): string {
  return dateFmt.format(new Date(date));
}

export function formatDateTime(date: Date | string | number): string {
  return dateTimeFmt.format(new Date(date));
}

export function formatRelative(date: Date | string | number): string {
  const now = Date.now();
  const d = new Date(date).getTime();
  const diffSeconds = Math.round((d - now) / 1000);
  const absDiff = Math.abs(diffSeconds);

  if (absDiff < 60) return rtf.format(diffSeconds, 'second');
  if (absDiff < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
  if (absDiff < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
  if (absDiff < 2592000) return rtf.format(Math.round(diffSeconds / 86400), 'day');
  return formatDate(date);
}

const sessionStatusMap: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  kickoff: 'Kickoff',
  execution: 'Em Execução',
  wrapup: 'Encerramento',
  closed: 'Finalizada',
};

export function sessionStatusLabel(status: string): string {
  return sessionStatusMap[status] ?? status;
}

const bugSeverityMap: Record<string, string> = {
  blocker: 'Bloqueante',
  major: 'Grave',
  minor: 'Baixa',
  enhancement: 'Melhoria',
};

export function bugSeverityLabel(severity: string): string {
  return bugSeverityMap[severity] ?? severity;
}

const bugStatusMap: Record<string, string> = {
  open: 'Aberto',
  confirmed: 'Confirmado',
  fixed: 'Corrigido',
  wontfix: 'Não Corrigir',
  duplicate: 'Duplicado',
};

export function bugStatusLabel(status: string): string {
  return bugStatusMap[status] ?? status;
}

const bugTypeMap: Record<string, string> = {
  bug: 'Bug',
  improvement: 'Melhoria',
  ux_insight: 'Insight UX',
};

export function bugTypeLabel(type: string): string {
  return bugTypeMap[type] ?? type;
}
