import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testScripts, testSteps, testStepResults } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

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

  // Check if user already has a result for this step
  const existing = db.select().from(testStepResults)
    .where(and(
      eq(testStepResults.stepId, stepId),
      eq(testStepResults.userId, user.id),
      eq(testStepResults.sessionId, params.id!),
    ))
    .get();

  if (existing) {
    // Update existing result
    db.update(testStepResults)
      .set({ status, notes: notes || null, completedAt: new Date() })
      .where(eq(testStepResults.id, existing.id))
      .run();
  } else {
    // Create new result
    db.insert(testStepResults).values({
      id: crypto.randomUUID(),
      stepId,
      userId: user.id,
      sessionId: params.id!,
      status,
      notes: notes || null,
      completedAt: new Date(),
    }).run();
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Get all results for this script by the current user
  const results = db
    .select({
      stepId: testStepResults.stepId,
      status: testStepResults.status,
      notes: testStepResults.notes,
    })
    .from(testStepResults)
    .where(and(
      eq(testStepResults.sessionId, params.id!),
      eq(testStepResults.userId, user.id),
    ))
    .all();

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
};
