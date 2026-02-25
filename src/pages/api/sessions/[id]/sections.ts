import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testScripts, testSections, testScenarios } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'node:crypto';

// GET: fetch all sections for a session (with scenarios)
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const scripts = db.select().from(testScripts).where(eq(testScripts.sessionId, params.id!)).all();
  if (scripts.length === 0) {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
  }

  const result = [];
  for (const script of scripts) {
    const sections = db
      .select()
      .from(testSections)
      .where(eq(testSections.scriptId, script.id))
      .orderBy(testSections.sortOrder)
      .all();

    for (const section of sections) {
      const scenarios = db
        .select()
        .from(testScenarios)
        .where(eq(testScenarios.sectionId, section.id))
        .orderBy(testScenarios.sortOrder)
        .all();

      result.push({ ...section, scriptTitle: script.title, scenarios });
    }
  }

  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
};

// POST: create a section
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const body = await request.json();
  const { scriptId, title, description, status: sectionStatus } = body;

  if (!scriptId || !title) {
    return new Response(JSON.stringify({ error: 'scriptId and title required' }), { status: 400 });
  }

  const maxOrder = db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(testSections)
    .where(eq(testSections.scriptId, scriptId))
    .get()!.max;

  const sectionId = crypto.randomUUID();
  db.insert(testSections).values({
    id: sectionId,
    scriptId,
    title,
    description: description || null,
    status: sectionStatus || 'active',
    sortOrder: maxOrder + 1,
    createdAt: new Date(),
  }).run();

  return new Response(JSON.stringify({ id: sectionId }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
