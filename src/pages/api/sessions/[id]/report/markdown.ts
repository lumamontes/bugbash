import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, bugs, sessionParticipants, users } from '@db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireSessionContext } from '@lib/services/helpers';

const severityEmoji: Record<string, string> = {
  blocker: '\uD83D\uDD34',
  major: '\uD83D\uDFE0',
  minor: '\uD83D\uDFE1',
  enhancement: '\uD83D\uDFE2',
};

const severityLabel: Record<string, string> = {
  blocker: 'Bloqueante',
  major: 'Grave',
  minor: 'Menor',
  enhancement: 'Melhoria',
};

const statusLabel: Record<string, string> = {
  open: 'Aberto',
  confirmed: 'Confirmado',
  fixed: 'Corrigido',
  wontfix: 'Não Corrigir',
  duplicate: 'Duplicado',
};

export const GET: APIRoute = async ({ params, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const session = (await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, params.id!))
  )[0]!;

  const allBugs = await db
    .select({
      title: bugs.title,
      severity: bugs.severity,
      status: bugs.status,
      type: bugs.type,
      description: bugs.description,
      reporterName: users.name,
    })
    .from(bugs)
    .innerJoin(users, eq(bugs.reportedBy, users.id))
    .where(eq(bugs.sessionId, params.id!))
    .orderBy(desc(bugs.createdAt));

  const participantCount = (await db
    .select({ id: sessionParticipants.id })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, params.id!)))
    .length;

  const severityCounts: Record<string, number> = { blocker: 0, major: 0, minor: 0, enhancement: 0 };
  allBugs.forEach(b => { severityCounts[b.severity]++; });

  const lines: string[] = [];
  lines.push(`# Bug Bash: ${session.title}`);
  lines.push('');
  if (session.description) {
    lines.push(`> ${session.description}`);
    lines.push('');
  }
  lines.push('## Resumo');
  lines.push('');
  lines.push(`- **Total de bugs:** ${allBugs.length}`);
  lines.push(`- **Participantes:** ${participantCount}`);
  lines.push(`- **Bloqueantes:** ${severityCounts.blocker}`);
  lines.push(`- **Graves:** ${severityCounts.major}`);
  lines.push(`- **Menores:** ${severityCounts.minor}`);
  lines.push(`- **Melhorias:** ${severityCounts.enhancement}`);
  lines.push('');

  if (allBugs.length > 0) {
    lines.push('## Bugs');
    lines.push('');
    lines.push('| # | Título | Severidade | Status | Reporter |');
    lines.push('|---|--------|-----------|--------|----------|');
    allBugs.forEach((bug, i) => {
      const sev = `${severityEmoji[bug.severity] || ''} ${severityLabel[bug.severity] || bug.severity}`;
      const st = statusLabel[bug.status] || bug.status;
      lines.push(`| ${i + 1} | ${bug.title} | ${sev} | ${st} | ${bug.reporterName} |`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push(`_Gerado pelo Bug Bash Platform_`);

  const markdown = lines.join('\n');

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="bugbash-${session.title.replace(/[^a-zA-Z0-9]/g, '-')}.md"`,
    },
  });
};
