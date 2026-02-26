import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { scenarioExecutions } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { requireSessionContext } from '@lib/services/helpers';
import crypto from 'node:crypto';
import { evaluateBadges } from '@lib/gamification';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const body = await request.json();
  const { status, comment } = body;

  if (!status) {
    return new Response(JSON.stringify({ error: 'status required' }), { status: 400 });
  }

  if ((status === 'partial' || status === 'blocked') && !comment) {
    return new Response(JSON.stringify({ error: 'comment required for partial/blocked status' }), { status: 400 });
  }

  const existing = (await db
    .select()
    .from(scenarioExecutions)
    .where(and(
      eq(scenarioExecutions.scenarioId, params.scenarioId!),
      eq(scenarioExecutions.userId, ctx.user.id),
      eq(scenarioExecutions.sessionId, params.id!),
    )))[0];

  if (existing) {
    await db.update(scenarioExecutions)
      .set({
        status,
        comment: comment || null,
        executedAt: new Date(),
      })
      .where(eq(scenarioExecutions.id, existing.id));
  } else {
    await db.insert(scenarioExecutions).values({
      id: crypto.randomUUID(),
      scenarioId: params.scenarioId!,
      userId: ctx.user.id,
      sessionId: params.id!,
      status,
      comment: comment || null,
      executedAt: new Date(),
      createdAt: new Date(),
    });
  }

  try {
    await evaluateBadges(ctx.user.id, 'script_completed', { sessionId: params.id! });
  } catch {}

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
