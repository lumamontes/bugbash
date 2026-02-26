import { db } from '@db/index';
import { bugs, bugComments, bugEvidence, bugTags, tags, users, testSteps, testScripts } from '@db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import { computeQualityScore } from '@lib/quality';
import { evaluateBadges } from '@lib/gamification';

/** Create a bug and evaluate badges. Returns the new bug ID. */
export async function createBug(
  sessionId: string,
  userId: string,
  data: {
    title: string;
    description: string | null;
    stepsToReproduce: string | null;
    severity: string;
    type: string;
    testStepId: string | null;
    reportMode: string;
    testScenarioId: string | null;
    testSectionId: string | null;
    tagIds: string[];
  },
) {
  const quality = computeQualityScore({
    title: data.title,
    description: data.description || '',
    stepsToReproduce: data.stepsToReproduce || '',
    severity: data.severity,
    hasEvidence: false,
  });

  const now = new Date();
  const bugId = crypto.randomUUID();

  await db.insert(bugs).values({
    id: bugId,
    sessionId,
    reportedBy: userId,
    title: data.title,
    description: data.description,
    stepsToReproduce: data.stepsToReproduce,
    severity: data.severity,
    type: data.type,
    status: 'open',
    qualityScore: quality.score,
    testStepId: data.testStepId,
    reportMode: data.reportMode,
    testScenarioId: data.testScenarioId,
    testSectionId: data.testSectionId,
    reportedVia: 'platform',
    createdAt: now,
    updatedAt: now,
  });

  for (const tagId of data.tagIds) {
    await db.insert(bugTags).values({
      id: crypto.randomUUID(),
      bugId,
      tagId,
    });
  }

  try {
    await evaluateBadges(userId, 'bug_created', { sessionId, bugId });
  } catch {
    // Badge evaluation errors should not block bug creation
  }

  return bugId;
}

/** Get a bug with full details (reporter name, etc.). */
export async function getBugWithDetails(bugId: string) {
  return (
    await db
      .select({
        id: bugs.id,
        title: bugs.title,
        description: bugs.description,
        stepsToReproduce: bugs.stepsToReproduce,
        severity: bugs.severity,
        type: bugs.type,
        status: bugs.status,
        qualityScore: bugs.qualityScore,
        reportedVia: bugs.reportedVia,
        testStepId: bugs.testStepId,
        linearIssueId: bugs.linearIssueId,
        linearIssueUrl: bugs.linearIssueUrl,
        createdAt: bugs.createdAt,
        updatedAt: bugs.updatedAt,
        reporterName: users.name,
      })
      .from(bugs)
      .innerJoin(users, eq(bugs.reportedBy, users.id))
      .where(eq(bugs.id, bugId))
      .limit(1)
  )[0];
}

const validSeverities = ['blocker', 'major', 'minor', 'enhancement'];

/** Update bug severity. Returns error string or null. */
export async function updateSeverity(bugId: string, severity: string) {
  if (!validSeverities.includes(severity)) return 'Invalid severity';
  await db.update(bugs).set({ severity, updatedAt: new Date() }).where(eq(bugs.id, bugId));
  return null;
}

const validStatuses = ['open', 'confirmed', 'fixed', 'wontfix', 'duplicate'];

/** Update bug status. Returns error string or null. */
export async function updateStatus(bugId: string, status: string) {
  if (!validStatuses.includes(status)) return 'Invalid status';
  await db.update(bugs).set({ status, updatedAt: new Date() }).where(eq(bugs.id, bugId));
  return null;
}

/** Add a comment to a bug. */
export async function addComment(bugId: string, userId: string, content: string) {
  await db.insert(bugComments).values({
    id: crypto.randomUUID(),
    bugId,
    userId,
    content,
    createdAt: new Date(),
  });
}

/** Get tags for a specific bug. */
export async function getBugTags(bugId: string) {
  return db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(bugTags)
    .innerJoin(tags, eq(bugTags.tagId, tags.id))
    .where(eq(bugTags.bugId, bugId));
}

/** Get evidence list for a bug. */
export async function getBugEvidence(bugId: string) {
  return db
    .select({
      id: bugEvidence.id,
      type: bugEvidence.type as typeof bugEvidence.type,
      url: bugEvidence.url,
      filename: bugEvidence.filename,
    })
    .from(bugEvidence)
    .where(eq(bugEvidence.bugId, bugId)) as Promise<{ id: string; type: 'screenshot' | 'video' | 'file'; url: string; filename: string }[]>;
}

/** Get the linked test step info for a bug. */
export async function getLinkedStep(testStepId: string) {
  const step = (
    await db
      .select({ instruction: testSteps.instruction, scriptId: testSteps.scriptId })
      .from(testSteps)
      .where(eq(testSteps.id, testStepId))
      .limit(1)
  )[0];
  if (!step) return null;
  const script = (
    await db.select({ title: testScripts.title }).from(testScripts).where(eq(testScripts.id, step.scriptId))
  )[0];
  return { instruction: step.instruction, scriptTitle: script?.title || '' };
}

/** Get comments for a bug. */
export async function getBugComments(bugId: string) {
  return db
    .select({
      id: bugComments.id,
      content: bugComments.content,
      createdAt: bugComments.createdAt,
      userName: users.name,
    })
    .from(bugComments)
    .innerJoin(users, eq(bugComments.userId, users.id))
    .where(eq(bugComments.bugId, bugId))
    .orderBy(bugComments.createdAt);
}

/** Search bugs in a session by query. */
export async function searchBugs(sessionId: string, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) return [];

  return db
    .select({ id: bugs.id, title: bugs.title, severity: bugs.severity, status: bugs.status })
    .from(bugs)
    .where(and(
      eq(bugs.sessionId, sessionId),
      sql`title ILIKE ANY(ARRAY[${words.map((w) => `%${w}%`).join(',')}])`,
    ))
    .limit(5);
}

/** Verify a bug belongs to a session. */
export async function getBugInSession(bugId: string, sessionId: string) {
  const bug = (await db.select().from(bugs).where(eq(bugs.id, bugId)))[0];
  if (!bug || bug.sessionId !== sessionId) return null;
  return bug;
}
