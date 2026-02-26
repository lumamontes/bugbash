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

  const scenario = (await db.select().from(testScenarios).where(eq(testScenarios.id, params.scenarioId!)))[0];
  if (!scenario || scenario.sectionId !== params.sectionId!) return new Response('Scenario not found', { status: 404 });

  const body = await request.json();
  const updates: Record<string, any> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.precondition !== undefined) updates.precondition = body.precondition;
  if (body.stepsToExecute !== undefined) updates.stepsToExecute = body.stepsToExecute;
  if (body.expectedResult !== undefined) updates.expectedResult = body.expectedResult;
  if (body.keyRules !== undefined) updates.keyRules = body.keyRules;
  if (body.dependsOn !== undefined) updates.dependsOn = body.dependsOn;
  if (body.persona !== undefined) updates.persona = body.persona;

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  await db.update(testScenarios).set(updates).where(eq(testScenarios.id, params.scenarioId!));

  const updated = (await db.select().from(testScenarios).where(eq(testScenarios.id, params.scenarioId!)))[0];
  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const section = (await db.select().from(testSections).where(eq(testSections.id, params.sectionId!)))[0];
  if (!section) return new Response('Section not found', { status: 404 });

  const scenario = (await db.select().from(testScenarios).where(eq(testScenarios.id, params.scenarioId!)))[0];
  if (!scenario || scenario.sectionId !== params.sectionId!) return new Response('Scenario not found', { status: 404 });

  await db.delete(scenarioExecutions).where(eq(scenarioExecutions.scenarioId, params.scenarioId!));
  await db.delete(testScenarios).where(eq(testScenarios.id, params.scenarioId!));

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
