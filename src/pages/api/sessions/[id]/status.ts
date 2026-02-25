import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions } from '@db/schema';
import { eq } from 'drizzle-orm';

const validTransitions: Record<string, string> = {
  draft: 'scheduled',
  scheduled: 'kickoff',
  kickoff: 'execution',
  execution: 'wrapup',
  wrapup: 'closed',
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) {
    return new Response('Not found', { status: 404 });
  }

  const body = await request.json();
  const newStatus = body.status;

  if (validTransitions[session.status] !== newStatus) {
    return new Response(JSON.stringify({ error: 'Invalid transition' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'kickoff') updates.startedAt = new Date();
  if (newStatus === 'closed') updates.endedAt = new Date();

  db.update(sessions).set(updates).where(eq(sessions.id, params.id!)).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
