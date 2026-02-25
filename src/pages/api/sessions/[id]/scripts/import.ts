import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testScripts, testSections, testScenarios } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'node:crypto';

function parseMarkdown(content: string, scriptId: string) {
  const sections: { title: string; scenarios: { title: string }[] }[] = [];
  let currentSection: { title: string; scenarios: { title: string }[] } | null = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      currentSection = { title: trimmed.slice(3).trim(), scenarios: [] };
      sections.push(currentSection);
    } else if (trimmed.startsWith('- ') && currentSection) {
      currentSection.scenarios.push({ title: trimmed.slice(2).trim() });
    }
  }

  return sections;
}

function parseCsv(content: string) {
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const sectionIdx = header.indexOf('section');
  const titleIdx = header.indexOf('title');
  const preconditionIdx = header.indexOf('precondition');
  const stepsIdx = header.indexOf('steps');
  const expectedIdx = header.indexOf('expected_result');
  const personaIdx = header.indexOf('persona');

  if (sectionIdx === -1 || titleIdx === -1) return [];

  const sectionsMap = new Map<string, { title: string; scenarios: { title: string; precondition?: string; stepsToExecute?: string; expectedResult?: string; persona?: string }[] }>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const sectionTitle = cols[sectionIdx];
    const scenarioTitle = cols[titleIdx];
    if (!sectionTitle || !scenarioTitle) continue;

    if (!sectionsMap.has(sectionTitle)) {
      sectionsMap.set(sectionTitle, { title: sectionTitle, scenarios: [] });
    }

    sectionsMap.get(sectionTitle)!.scenarios.push({
      title: scenarioTitle,
      precondition: preconditionIdx >= 0 ? cols[preconditionIdx] || undefined : undefined,
      stepsToExecute: stepsIdx >= 0 ? cols[stepsIdx] || undefined : undefined,
      expectedResult: expectedIdx >= 0 ? cols[expectedIdx] || undefined : undefined,
      persona: personaIdx >= 0 ? cols[personaIdx] || undefined : undefined,
    });
  }

  return Array.from(sectionsMap.values());
}

export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const body = await request.json();
  const { format, content, scriptId } = body;

  if (!format || !content || !scriptId) {
    return new Response(JSON.stringify({ error: 'format, content, and scriptId are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (format !== 'markdown' && format !== 'csv') {
    return new Response(JSON.stringify({ error: 'format must be markdown or csv' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Verify scriptId belongs to this session
  const script = db.select().from(testScripts).where(eq(testScripts.id, scriptId)).get();
  if (!script || script.sessionId !== params.id!) {
    return new Response(JSON.stringify({ error: 'Script not found for this session' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const parsed = format === 'markdown' ? parseMarkdown(content, scriptId) : parseCsv(content);

  let sectionsCreated = 0;
  let scenariosCreated = 0;

  // Get current max sort order for sections in this script
  const maxSectionOrder = db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(testSections)
    .where(eq(testSections.scriptId, scriptId))
    .get()!.max;

  for (let si = 0; si < parsed.length; si++) {
    const section = parsed[si];
    const sectionId = crypto.randomUUID();

    db.insert(testSections).values({
      id: sectionId,
      scriptId,
      title: section.title,
      status: 'active',
      sortOrder: maxSectionOrder + 1 + si,
      createdAt: new Date(),
    }).run();
    sectionsCreated++;

    for (let sci = 0; sci < section.scenarios.length; sci++) {
      const scenario = section.scenarios[sci];
      const scenarioId = crypto.randomUUID();

      db.insert(testScenarios).values({
        id: scenarioId,
        sectionId,
        title: scenario.title,
        precondition: ('precondition' in scenario ? scenario.precondition : undefined) || null,
        stepsToExecute: ('stepsToExecute' in scenario ? scenario.stepsToExecute : undefined) || null,
        expectedResult: ('expectedResult' in scenario ? scenario.expectedResult : undefined) || null,
        persona: ('persona' in scenario ? scenario.persona : undefined) || null,
        sortOrder: sci,
        createdAt: new Date(),
      }).run();
      scenariosCreated++;
    }
  }

  return new Response(JSON.stringify({ sections: sectionsCreated, scenarios: scenariosCreated }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
