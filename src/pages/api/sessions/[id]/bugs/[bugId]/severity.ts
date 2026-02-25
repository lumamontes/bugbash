import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, bugs } from '@db/schema';
import { eq } from 'drizzle-orm';

const validSeverities = ['blocker', 'major', 'minor', 'enhancement'];

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const bug = db.select().from(bugs).where(eq(bugs.id, params.bugId!)).get();
  if (!bug || bug.sessionId !== params.id) return new Response('Not found', { status: 404 });

  const body = await request.json();
  const newSeverity = body.severity;

  if (!validSeverities.includes(newSeverity)) {
    return new Response(JSON.stringify({ error: 'Invalid severity' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  db.update(bugs).set({ severity: newSeverity, updatedAt: new Date() }).where(eq(bugs.id, params.bugId!)).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
