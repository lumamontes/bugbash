import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, scenarioExecutions, testScenarios } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import { evaluateBadges } from '@lib/gamification';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const body = await request.json();
  const { status, comment } = body;

  if (!status) {
    return new Response(JSON.stringify({ error: 'status required' }), { status: 400 });
  }

  // Require comment for partial and blocked statuses
  if ((status === 'partial' || status === 'blocked') && !comment) {
    return new Response(JSON.stringify({ error: 'comment required for partial/blocked status' }), { status: 400 });
  }

  // Check if existing execution exists for this user + scenario
  const existing = db
    .select()
    .from(scenarioExecutions)
    .where(and(
      eq(scenarioExecutions.scenarioId, params.scenarioId!),
      eq(scenarioExecutions.userId, user.id),
      eq(scenarioExecutions.sessionId, params.id!),
    ))
    .get();

  if (existing) {
    // Update existing execution
    db.update(scenarioExecutions)
      .set({
        status,
        comment: comment || null,
        executedAt: new Date(),
      })
      .where(eq(scenarioExecutions.id, existing.id))
      .run();
  } else {
    // Create new execution
    db.insert(scenarioExecutions).values({
      id: crypto.randomUUID(),
      scenarioId: params.scenarioId!,
      userId: user.id,
      sessionId: params.id!,
      status,
      comment: comment || null,
      executedAt: new Date(),
      createdAt: new Date(),
    }).run();
  }

  // Trigger badge evaluation
  try {
    evaluateBadges(user.id, 'script_completed', { sessionId: params.id! });
  } catch {}

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
