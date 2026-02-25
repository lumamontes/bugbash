import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, bugs, bugTags } from '@db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { computeQualityScore } from '@lib/quality';
import { evaluateBadges } from '@lib/gamification';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const formData = await request.formData();
  const title = formData.get('title')?.toString()?.trim();

  if (!title) {
    return new Response(JSON.stringify({ error: 'missing_title' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const description = formData.get('description')?.toString()?.trim() || null;
  const stepsToReproduce = formData.get('stepsToReproduce')?.toString()?.trim() || null;
  const severity = formData.get('severity')?.toString() as 'blocker' | 'major' | 'minor' | 'enhancement';
  const type = (formData.get('type')?.toString() || 'bug') as 'bug' | 'improvement' | 'ux_insight';
  const testStepId = formData.get('testStepId')?.toString() || null;
  const reportMode = (formData.get('reportMode')?.toString() || 'freeform') as 'guided' | 'freeform';
  const testScenarioId = formData.get('testScenarioId')?.toString() || null;
  const testSectionId = formData.get('testSectionId')?.toString() || null;
  const tagIds = formData.getAll('tags').map(t => t.toString());

  // Compute quality score (evidence will be added after creation)
  const quality = computeQualityScore({
    title: title || '',
    description: description || '',
    stepsToReproduce: stepsToReproduce || '',
    severity: severity || '',
    hasEvidence: false,
  });

  const now = new Date();
  const bugId = crypto.randomUUID();

  db.insert(bugs).values({
    id: bugId,
    sessionId: params.id!,
    reportedBy: user.id,
    title,
    description,
    stepsToReproduce,
    severity,
    type,
    status: 'open',
    qualityScore: quality.score,
    testStepId: testStepId || null,
    reportMode,
    testScenarioId: testScenarioId || null,
    testSectionId: testSectionId || null,
    reportedVia: 'platform',
    createdAt: now,
    updatedAt: now,
  }).run();

  // Insert bug tags
  for (const tagId of tagIds) {
    db.insert(bugTags).values({
      id: crypto.randomUUID(),
      bugId,
      tagId,
    }).run();
  }

  // Evaluate badges after bug creation
  try {
    evaluateBadges(user.id, 'bug_created', { sessionId: params.id!, bugId });
  } catch {
    // Badge evaluation errors should not block bug creation
  }

  return new Response(JSON.stringify({ id: bugId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
