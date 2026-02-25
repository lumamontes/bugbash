import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testScripts, testSteps } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const script = db.select().from(testScripts).where(eq(testScripts.id, params.scriptId!)).get();
  if (!script || script.sessionId !== params.id) return new Response('Not found', { status: 404 });

  const body = await request.json();
  const { instruction, expectedResult } = body;
  if (!instruction) return new Response('Missing instruction', { status: 400 });

  const maxOrder = db.select({ max: sql<number>`COALESCE(MAX(order_index), -1)` })
    .from(testSteps)
    .where(eq(testSteps.scriptId, params.scriptId!))
    .get()!.max;

  const stepId = crypto.randomUUID();
  db.insert(testSteps).values({
    id: stepId,
    scriptId: params.scriptId!,
    instruction,
    expectedResult: expectedResult || null,
    orderIndex: maxOrder + 1,
  }).run();

  return new Response(JSON.stringify({ id: stepId }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const { stepId, instruction, expectedResult } = body;
  if (!stepId) return new Response('Missing stepId', { status: 400 });

  const updates: Record<string, unknown> = {};
  if (instruction !== undefined) updates.instruction = instruction;
  if (expectedResult !== undefined) updates.expectedResult = expectedResult;

  db.update(testSteps).set(updates).where(eq(testSteps.id, stepId)).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const { stepId } = body;
  if (!stepId) return new Response('Missing stepId', { status: 400 });

  db.delete(testSteps).where(eq(testSteps.id, stepId)).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
