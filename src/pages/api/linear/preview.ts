import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { bugs, users, sessions } from '@db/schema';
import { eq } from 'drizzle-orm';
import { formatBugForLinear } from '@lib/ai/linear-formatter';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { bugId } = await request.json();
  if (!bugId) {
    return new Response(JSON.stringify({ error: 'bugId required' }), { status: 400 });
  }

  const bug = (await db
    .select({
      title: bugs.title,
      description: bugs.description,
      stepsToReproduce: bugs.stepsToReproduce,
      severity: bugs.severity,
      type: bugs.type,
      sessionId: bugs.sessionId,
      reporterName: users.name,
    })
    .from(bugs)
    .innerJoin(users, eq(bugs.reportedBy, users.id))
    .where(eq(bugs.id, bugId))
    )[0];

  if (!bug) {
    return new Response(JSON.stringify({ error: 'Bug not found' }), { status: 404 });
  }

  const session = (await db.select({ title: sessions.title }).from(sessions).where(eq(sessions.id, bug.sessionId)))[0];

  const original = {
    title: bug.title,
    description: [
      bug.description && `## Descrição\n${bug.description}`,
      bug.stepsToReproduce && `## Passos para Reproduzir\n${bug.stepsToReproduce}`,
      `## Informações\n- **Severidade:** ${bug.severity}\n- **Reporter:** ${bug.reporterName}`,
    ].filter(Boolean).join('\n\n'),
  };

  const suggested = await formatBugForLinear({
    title: bug.title,
    description: bug.description,
    stepsToReproduce: bug.stepsToReproduce,
    severity: bug.severity,
    type: bug.type,
    reporterName: bug.reporterName,
    sessionTitle: session?.title || '',
  });

  return new Response(JSON.stringify({ original, suggested }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
