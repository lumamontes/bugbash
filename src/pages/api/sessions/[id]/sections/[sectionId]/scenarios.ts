import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testSections, testScenarios } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'node:crypto';

// POST: create a scenario in a section
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const { title, precondition, stepsToExecute, expectedResult, keyRules, dependsOn, persona } = body;

  if (!title) {
    return new Response(JSON.stringify({ error: 'title required' }), { status: 400 });
  }

  const maxOrder = db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(testScenarios)
    .where(eq(testScenarios.sectionId, params.sectionId!))
    .get()!.max;

  const scenarioId = crypto.randomUUID();
  db.insert(testScenarios).values({
    id: scenarioId,
    sectionId: params.sectionId!,
    title,
    precondition: precondition || null,
    stepsToExecute: stepsToExecute || null,
    expectedResult: expectedResult || null,
    keyRules: keyRules || null,
    dependsOn: dependsOn || null,
    persona: persona || null,
    sortOrder: maxOrder + 1,
    createdAt: new Date(),
  }).run();

  return new Response(JSON.stringify({ id: scenarioId }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
