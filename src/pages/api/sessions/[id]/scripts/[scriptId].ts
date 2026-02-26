import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { testScripts, testSteps } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireSessionContext } from '@lib/services/helpers';

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;

  if (Object.keys(updates).length > 0) {
    await db.update(testScripts).set(updates).where(eq(testScripts.id, params.scriptId!));
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  await db.delete(testSteps).where(eq(testSteps.scriptId, params.scriptId!));
  await db.delete(testScripts).where(eq(testScripts.id, params.scriptId!));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
