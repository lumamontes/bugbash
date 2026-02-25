import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { bugs } from '@db/schema';
import { eq } from 'drizzle-orm';
import { createLinearIssue, isLinearConfigured } from '@lib/linear';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  if (!isLinearConfigured()) {
    return new Response(JSON.stringify({ error: 'Linear not configured' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { bugId, title, description } = await request.json();
  if (!bugId || !title) {
    return new Response(JSON.stringify({ error: 'bugId and title required' }), { status: 400 });
  }

  const bug = db.select().from(bugs).where(eq(bugs.id, bugId)).get();
  if (!bug) {
    return new Response(JSON.stringify({ error: 'Bug not found' }), { status: 404 });
  }

  try {
    const result = await createLinearIssue({
      title,
      description: description || '',
      severity: bug.severity,
    });

    // Update bug with Linear issue info
    db.update(bugs)
      .set({
        linearIssueId: result.issueId,
        linearIssueUrl: result.issueUrl,
        updatedAt: new Date(),
      })
      .where(eq(bugs.id, bugId))
      .run();

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Linear export failed:', err);
    return new Response(JSON.stringify({ error: err.message || 'Export failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
