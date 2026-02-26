import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { testScripts, testSections, testScenarios } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireSessionContext } from '@lib/services/helpers';
import crypto from 'node:crypto';

export const GET: APIRoute = async ({ params, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const scripts = await db.select().from(testScripts).where(eq(testScripts.sessionId, params.id!));
  if (scripts.length === 0) {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
  }

  const result = [];
  for (const script of scripts) {
    const sections = await db
      .select()
      .from(testSections)
      .where(eq(testSections.scriptId, script.id))
      .orderBy(testSections.sortOrder);

    for (const section of sections) {
      const scenarios = await db
        .select()
        .from(testScenarios)
        .where(eq(testScenarios.sectionId, section.id))
        .orderBy(testScenarios.sortOrder);

      result.push({ ...section, scriptTitle: script.title, scenarios });
    }
  }

  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const body = await request.json();
  const { scriptId, title, description, status: sectionStatus } = body;

  if (!scriptId || !title) {
    return new Response(JSON.stringify({ error: 'scriptId and title required' }), { status: 400 });
  }

  const maxOrder = (await db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(testSections)
    .where(eq(testSections.scriptId, scriptId))
  )[0]!.max;

  const sectionId = crypto.randomUUID();
  await db.insert(testSections).values({
    id: sectionId,
    scriptId,
    title,
    description: description || null,
    status: sectionStatus || 'active',
    sortOrder: maxOrder + 1,
    createdAt: new Date(),
  });

  return new Response(JSON.stringify({ id: sectionId }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
