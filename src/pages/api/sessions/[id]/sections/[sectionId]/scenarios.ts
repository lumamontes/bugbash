import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { testScenarios } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireUser } from '@lib/services/helpers';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = requireUser(locals);
  if (user instanceof Response) return user;

  const body = await request.json();
  const { title, precondition, stepsToExecute, expectedResult, keyRules, dependsOn, persona } = body;

  if (!title) {
    return new Response(JSON.stringify({ error: 'title required' }), { status: 400 });
  }

  const maxOrder = (await db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(testScenarios)
    .where(eq(testScenarios.sectionId, params.sectionId!))
  )[0]!.max;

  const scenarioId = crypto.randomUUID();
  await db.insert(testScenarios).values({
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
  });

  return new Response(JSON.stringify({ id: scenarioId }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
