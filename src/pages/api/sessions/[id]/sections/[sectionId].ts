import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { testSections, testScenarios, scenarioExecutions } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireSessionContext } from '@lib/services/helpers';

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const section = (await db.select().from(testSections).where(eq(testSections.id, params.sectionId!)))[0];
  if (!section) return new Response('Section not found', { status: 404 });

  const body = await request.json();
  const updates: Record<string, any> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.notReadyReason !== undefined) updates.notReadyReason = body.notReadyReason;

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  await db.update(testSections).set(updates).where(eq(testSections.id, params.sectionId!));

  const updated = (await db.select().from(testSections).where(eq(testSections.id, params.sectionId!)))[0];
  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const section = (await db.select().from(testSections).where(eq(testSections.id, params.sectionId!)))[0];
  if (!section) return new Response('Section not found', { status: 404 });

  const scenarios = await db.select().from(testScenarios).where(eq(testScenarios.sectionId, params.sectionId!));
  for (const scenario of scenarios) {
    await db.delete(scenarioExecutions).where(eq(scenarioExecutions.scenarioId, scenario.id));
  }

  await db.delete(testScenarios).where(eq(testScenarios.sectionId, params.sectionId!));
  await db.delete(testSections).where(eq(testSections.id, params.sectionId!));

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
