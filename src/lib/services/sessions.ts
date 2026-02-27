import { db } from '@db/index';
import {
  sessions,
  sessionParticipants,
  testScripts,
  testSteps,
  testSections,
  testScenarios,
  testCredentials,
  testResources,
  bugs,
  users,
} from '@db/schema';
import { eq, count, sql, desc, and } from 'drizzle-orm';
import crypto from 'node:crypto';

/** Fetch a session with its creator's name. */
export async function getSessionWithCreator(sessionId: string) {
  return (
    await db
      .select({
        id: sessions.id,
        title: sessions.title,
        description: sessions.description,
        status: sessions.status,
        orgId: sessions.orgId,
        createdBy: sessions.createdBy,
        scheduledAt: sessions.scheduledAt,
        startedAt: sessions.startedAt,
        endedAt: sessions.endedAt,
        kickoffDuration: sessions.kickoffDuration,
        executionDuration: sessions.executionDuration,
        wrapupDuration: sessions.wrapupDuration,
        createdAt: sessions.createdAt,
        creatorName: users.name,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.createdBy, users.id))
      .where(eq(sessions.id, sessionId))
      .limit(1)
  )[0];
}

/** Get aggregate counts for a session (participants, bugs, scripts, credentials). */
export async function getSessionCounts(sessionId: string) {
  const [p, b, s, c] = await Promise.all([
    db.select({ count: count() }).from(sessionParticipants).where(eq(sessionParticipants.sessionId, sessionId)),
    db.select({ count: count() }).from(bugs).where(eq(bugs.sessionId, sessionId)),
    db.select({ count: count() }).from(testScripts).where(eq(testScripts.sessionId, sessionId)),
    db.select({ count: count() }).from(testCredentials).where(eq(testCredentials.sessionId, sessionId)),
  ]);
  return {
    participantsCount: p[0]!.count,
    bugsCount: b[0]!.count,
    scriptsCount: s[0]!.count,
    credentialsCount: c[0]!.count,
  };
}

/** Get the participants list for a session with user info. */
export async function getParticipants(sessionId: string) {
  return db
    .select({
      id: sessionParticipants.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      squadId: users.squadId,
    })
    .from(sessionParticipants)
    .innerJoin(users, eq(sessionParticipants.userId, users.id))
    .where(eq(sessionParticipants.sessionId, sessionId));
}

/** Get credentials for a session, including claimed-by name via subquery. */
export async function getCredentials(sessionId: string) {
  return db
    .select({
      id: testCredentials.id,
      profileType: testCredentials.profileType,
      username: testCredentials.username,
      password: testCredentials.password,
      environment: testCredentials.environment,
      claimedBy: testCredentials.claimedBy,
      claimedByName: sql<string | null>`(SELECT name FROM users WHERE id = ${testCredentials.claimedBy})`,
    })
    .from(testCredentials)
    .where(eq(testCredentials.sessionId, sessionId));
}

/** Get all bugs for a session with reporter name, ordered by most recent. */
export async function getBugsList(sessionId: string) {
  return db
    .select({
      id: bugs.id,
      title: bugs.title,
      severity: bugs.severity,
      status: bugs.status,
      reportedVia: bugs.reportedVia,
      createdAt: bugs.createdAt,
      reporterName: users.name,
    })
    .from(bugs)
    .innerJoin(users, eq(bugs.reportedBy, users.id))
    .where(eq(bugs.sessionId, sessionId))
    .orderBy(desc(bugs.createdAt));
}

/** Get all bugs with type info (for reports). */
export async function getBugsListWithType(sessionId: string) {
  return db
    .select({
      id: bugs.id,
      title: bugs.title,
      severity: bugs.severity,
      status: bugs.status,
      type: bugs.type,
      reporterName: users.name,
      createdAt: bugs.createdAt,
    })
    .from(bugs)
    .innerJoin(users, eq(bugs.reportedBy, users.id))
    .where(eq(bugs.sessionId, sessionId))
    .orderBy(desc(bugs.createdAt));
}

/** Get scripts list for a session, ordered. */
export async function getScriptsList(sessionId: string) {
  return db
    .select({
      id: testScripts.id,
      title: testScripts.title,
      description: testScripts.description,
      orderIndex: testScripts.orderIndex,
    })
    .from(testScripts)
    .where(eq(testScripts.sessionId, sessionId))
    .orderBy(testScripts.orderIndex);
}

/** Get scripts with their steps (for interactive execution). */
export async function getScriptsWithSteps(sessionId: string) {
  const scriptsList = await getScriptsList(sessionId);
  return Promise.all(
    scriptsList.map(async (script) => {
      const steps = await db
        .select({
          id: testSteps.id,
          instruction: testSteps.instruction,
          expectedResult: testSteps.expectedResult,
          orderIndex: testSteps.orderIndex,
        })
        .from(testSteps)
        .where(eq(testSteps.scriptId, script.id))
        .orderBy(testSteps.orderIndex);
      return { ...script, steps };
    }),
  );
}

/** Get sections with scenarios for all scripts in a session. */
export async function getSectionsWithScenarios(sessionId: string) {
  const scriptsList = await getScriptsList(sessionId);
  const sectionsList: any[] = [];
  for (const script of scriptsList) {
    const dbSections = await db
      .select()
      .from(testSections)
      .where(eq(testSections.scriptId, script.id))
      .orderBy(testSections.sortOrder);
    for (const section of dbSections) {
      const scenarios = await db
        .select()
        .from(testScenarios)
        .where(eq(testScenarios.sectionId, section.id))
        .orderBy(testScenarios.sortOrder);
      sectionsList.push({ ...section, scriptTitle: script.title, scenarios });
    }
  }
  return sectionsList;
}

/** Create a new session. */
export async function createSession(data: {
  title: string;
  description: string | null;
  scheduledAt: Date | null;
  kickoffDuration: number;
  executionDuration: number;
  wrapupDuration: number;
}, user: { id: string; orgId: string }) {
  const id = crypto.randomUUID();
  await db.insert(sessions).values({
    id,
    title: data.title,
    description: data.description,
    status: 'draft',
    orgId: user.orgId,
    createdBy: user.id,
    scheduledAt: data.scheduledAt,
    kickoffDuration: data.kickoffDuration,
    executionDuration: data.executionDuration,
    wrapupDuration: data.wrapupDuration,
    createdAt: new Date(),
  });
  return id;
}

const phaseOrder = ['draft', 'scheduled', 'kickoff', 'execution', 'wrapup', 'closed'] as const;

const validTransitions: Record<string, string> = {
  draft: 'scheduled',
  scheduled: 'kickoff',
  kickoff: 'execution',
  execution: 'wrapup',
  wrapup: 'closed',
};

/** Update editable session properties. */
export async function updateSession(
  sessionId: string,
  data: Partial<{
    title: string;
    description: string | null;
    scheduledAt: Date | null;
    kickoffDuration: number;
    executionDuration: number;
    wrapupDuration: number;
  }>,
) {
  await db.update(sessions).set(data).where(eq(sessions.id, sessionId));
}

/** Rewind session to a previous phase. Returns error string or null on success. */
export async function restartPhase(sessionId: string, currentStatus: string, targetStatus: string) {
  const currentIndex = phaseOrder.indexOf(currentStatus as any);
  const targetIndex = phaseOrder.indexOf(targetStatus as any);

  if (targetIndex < 0 || currentIndex < 0) return 'Status inválido';
  if (targetIndex >= currentIndex) return 'O status alvo deve ser anterior ao status atual';

  const updates: Record<string, unknown> = { status: targetStatus };
  // Reset startedAt if rewinding to before kickoff
  if (targetIndex < phaseOrder.indexOf('kickoff')) {
    updates.startedAt = null;
  }
  // Reset endedAt if rewinding to before closed
  if (targetIndex < phaseOrder.indexOf('closed')) {
    updates.endedAt = null;
  }

  await db.update(sessions).set(updates).where(eq(sessions.id, sessionId));
  return null;
}

/** Transition session status. Returns error string or null on success. */
export async function transitionStatus(sessionId: string, currentStatus: string, newStatus: string) {
  if (validTransitions[currentStatus] !== newStatus) {
    return 'Invalid transition';
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'kickoff') updates.startedAt = new Date();
  if (newStatus === 'closed') updates.endedAt = new Date();

  await db.update(sessions).set(updates).where(eq(sessions.id, sessionId));
  return null;
}

/** Add a participant to a session (idempotent). */
export async function addParticipant(sessionId: string, userId: string) {
  const existing = (
    await db
      .select()
      .from(sessionParticipants)
      .where(and(eq(sessionParticipants.sessionId, sessionId), eq(sessionParticipants.userId, userId)))
  )[0];

  if (!existing) {
    await db.insert(sessionParticipants).values({
      id: crypto.randomUUID(),
      sessionId,
      userId,
      joinedAt: new Date(),
    });
  }
}

/** Remove a participant from a session. */
export async function removeParticipant(sessionId: string, userId: string) {
  await db
    .delete(sessionParticipants)
    .where(and(eq(sessionParticipants.sessionId, sessionId), eq(sessionParticipants.userId, userId)));
}

/** Add a test credential to a session. */
export async function addCredential(sessionId: string, data: {
  profileType: string;
  username: string;
  password: string;
  environment: string | null;
}) {
  await db.insert(testCredentials).values({
    id: crypto.randomUUID(),
    sessionId,
    profileType: data.profileType,
    username: data.username,
    password: data.password,
    environment: data.environment,
    createdAt: new Date(),
  });
}

/** Get test resources for a session, grouped and ordered. */
export async function getTestResources(sessionId: string) {
  return db
    .select()
    .from(testResources)
    .where(eq(testResources.sessionId, sessionId))
    .orderBy(testResources.sortOrder);
}

/** Add a test resource to a session. */
export async function addTestResource(sessionId: string, data: {
  label: string;
  value: string;
  group: string | null;
  sortOrder?: number;
}) {
  await db.insert(testResources).values({
    id: crypto.randomUUID(),
    sessionId,
    label: data.label,
    value: data.value,
    group: data.group,
    sortOrder: data.sortOrder ?? 0,
    createdAt: new Date(),
  });
}

/** Get session list for an org with counts. */
export async function getSessionList(orgId: string) {
  return db
    .select({
      id: sessions.id,
      title: sessions.title,
      status: sessions.status,
      createdAt: sessions.createdAt,
      creatorName: users.name,
      participantsCount: sql<number>`(SELECT COUNT(*) FROM session_participants WHERE session_id = ${sessions.id})`,
      bugsCount: sql<number>`(SELECT COUNT(*) FROM bugs WHERE session_id = ${sessions.id})`,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.createdBy, users.id))
    .where(eq(sessions.orgId, orgId))
    .orderBy(desc(sessions.createdAt));
}
