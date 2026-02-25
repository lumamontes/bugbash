import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testSections, testScenarios, scenarioExecutions } from '@db/schema';
import { eq, and } from 'drizzle-orm';

// PUT: update a section
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const section = db.select().from(testSections).where(eq(testSections.id, params.sectionId!)).get();
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

  db.update(testSections).set(updates).where(eq(testSections.id, params.sectionId!)).run();

  const updated = db.select().from(testSections).where(eq(testSections.id, params.sectionId!)).get();
  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE: cascade delete scenarios in section, then delete section
export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const section = db.select().from(testSections).where(eq(testSections.id, params.sectionId!)).get();
  if (!section) return new Response('Section not found', { status: 404 });

  // Get all scenarios in this section to delete their executions first
  const scenarios = db.select().from(testScenarios).where(eq(testScenarios.sectionId, params.sectionId!)).all();

  for (const scenario of scenarios) {
    db.delete(scenarioExecutions).where(eq(scenarioExecutions.scenarioId, scenario.id)).run();
  }

  // Delete all scenarios in this section
  db.delete(testScenarios).where(eq(testScenarios.sectionId, params.sectionId!)).run();

  // Delete the section
  db.delete(testSections).where(eq(testSections.id, params.sectionId!)).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
