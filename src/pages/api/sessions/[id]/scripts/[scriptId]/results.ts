import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { testStepResults } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { requireSessionContext, requireUser } from '@lib/services/helpers';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const body = await request.json();
  const { stepId, status, notes } = body;

  if (!stepId || !status) {
    return new Response(JSON.stringify({ error: 'Missing stepId or status' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validStatuses = ['passed', 'failed', 'blocked', 'skipped'];
  if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = (await db.select().from(testStepResults)
    .where(and(
      eq(testStepResults.stepId, stepId),
      eq(testStepResults.userId, ctx.user.id),
      eq(testStepResults.sessionId, params.id!),
    ))
    .limit(1))[0];

  if (existing) {
    await db.update(testStepResults)
      .set({ status, notes: notes || null, completedAt: new Date() })
      .where(eq(testStepResults.id, existing.id));
  } else {
    await db.insert(testStepResults).values({
      id: crypto.randomUUID(),
      stepId,
      userId: ctx.user.id,
      sessionId: params.id!,
      status,
      notes: notes || null,
      completedAt: new Date(),
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = async ({ params, locals }) => {
  const user = requireUser(locals);
  if (user instanceof Response) return user;

  const results = await db
    .select({
      stepId: testStepResults.stepId,
      status: testStepResults.status,
      notes: testStepResults.notes,
    })
    .from(testStepResults)
    .where(and(
      eq(testStepResults.sessionId, params.id!),
      eq(testStepResults.userId, user.id),
    ));

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
};
