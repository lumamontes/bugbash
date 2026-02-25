import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testSections, testScenarios } from '@db/schema';
import { eq } from 'drizzle-orm';

// PUT: reorder scenarios within a section
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const section = db.select().from(testSections).where(eq(testSections.id, params.sectionId!)).get();
  if (!section) return new Response('Section not found', { status: 404 });

  const body = await request.json();
  const { scenarioIds } = body;

  if (!Array.isArray(scenarioIds) || scenarioIds.length === 0) {
    return new Response(JSON.stringify({ error: 'scenarioIds array is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Update sort order for each scenario
  for (let i = 0; i < scenarioIds.length; i++) {
    db.update(testScenarios)
      .set({ sortOrder: i })
      .where(eq(testScenarios.id, scenarioIds[i]))
      .run();
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
