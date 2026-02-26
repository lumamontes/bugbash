import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { testScripts, testSteps } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireSessionContext, requireUser } from '@lib/services/helpers';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const script = (await db.select().from(testScripts).where(eq(testScripts.id, params.scriptId!)))[0];
  if (!script || script.sessionId !== params.id) return new Response('Not found', { status: 404 });

  const body = await request.json();
  const { instruction, expectedResult } = body;
  if (!instruction) return new Response('Missing instruction', { status: 400 });

  const maxOrder = (await db.select({ max: sql<number>`COALESCE(MAX(order_index), -1)` })
    .from(testSteps)
    .where(eq(testSteps.scriptId, params.scriptId!))
  )[0]!.max;

  const stepId = crypto.randomUUID();
  await db.insert(testSteps).values({
    id: stepId,
    scriptId: params.scriptId!,
    instruction,
    expectedResult: expectedResult || null,
    orderIndex: maxOrder + 1,
  });

  return new Response(JSON.stringify({ id: stepId }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = requireUser(locals);
  if (user instanceof Response) return user;

  const body = await request.json();
  const { stepId, instruction, expectedResult } = body;
  if (!stepId) return new Response('Missing stepId', { status: 400 });

  const updates: Record<string, unknown> = {};
  if (instruction !== undefined) updates.instruction = instruction;
  if (expectedResult !== undefined) updates.expectedResult = expectedResult;

  await db.update(testSteps).set(updates).where(eq(testSteps.id, stepId));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const user = requireUser(locals);
  if (user instanceof Response) return user;

  const body = await request.json();
  const { stepId } = body;
  if (!stepId) return new Response('Missing stepId', { status: 400 });

  await db.delete(testSteps).where(eq(testSteps.id, stepId));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
