import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testSections, testScenarios, scenarioExecutions } from '@db/schema';
import { eq } from 'drizzle-orm';

// PUT: update a scenario
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const section = db.select().from(testSections).where(eq(testSections.id, params.sectionId!)).get();
  if (!section) return new Response('Section not found', { status: 404 });

  const scenario = db.select().from(testScenarios).where(eq(testScenarios.id, params.scenarioId!)).get();
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

  db.update(testScenarios).set(updates).where(eq(testScenarios.id, params.scenarioId!)).run();

  const updated = db.select().from(testScenarios).where(eq(testScenarios.id, params.scenarioId!)).get();
  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE: delete a scenario
export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const section = db.select().from(testSections).where(eq(testSections.id, params.sectionId!)).get();
  if (!section) return new Response('Section not found', { status: 404 });

  const scenario = db.select().from(testScenarios).where(eq(testScenarios.id, params.scenarioId!)).get();
  if (!scenario || scenario.sectionId !== params.sectionId!) return new Response('Scenario not found', { status: 404 });

  // Delete executions for this scenario first
  db.delete(scenarioExecutions).where(eq(scenarioExecutions.scenarioId, params.scenarioId!)).run();

  // Delete the scenario
  db.delete(testScenarios).where(eq(testScenarios.id, params.scenarioId!)).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
