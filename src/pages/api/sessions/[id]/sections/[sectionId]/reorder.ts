import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { testSections, testScenarios } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireSessionContext } from '@lib/services/helpers';

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const section = (await db.select().from(testSections).where(eq(testSections.id, params.sectionId!)))[0];
  if (!section) return new Response('Section not found', { status: 404 });

  const body = await request.json();
  const { scenarioIds } = body;

  if (!Array.isArray(scenarioIds) || scenarioIds.length === 0) {
    return new Response(JSON.stringify({ error: 'scenarioIds array is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  for (let i = 0; i < scenarioIds.length; i++) {
    await db.update(testScenarios)
      .set({ sortOrder: i })
      .where(eq(testScenarios.id, scenarioIds[i]));
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
