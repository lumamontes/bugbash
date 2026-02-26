import { db } from '@db/index';
import {
  badgeDefinitions,
  userBadges,
  bugs,
  sessionParticipants,
  testStepResults,
  testSteps,
  testScripts,
  sessions,
} from '@db/schema';
import { eq, and, count, sql, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

export interface EarnedBadge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

interface EvalContext {
  sessionId?: string;
  bugId?: string;
}

export async function evaluateBadges(
  userId: string,
  trigger: 'bug_created' | 'script_completed' | 'session_ended' | 'triage_done',
  context: EvalContext = {},
): Promise<EarnedBadge[]> {
  const earned: EarnedBadge[] = [];

  const allBadges = await db.select().from(badgeDefinitions);

  const existingBadgesRows = await db
    .select({ badgeId: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));
  const earnedBadgeIds = new Set(existingBadgesRows.map(b => b.badgeId));

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    const shouldAward = await checkBadgeCondition(badge, userId, context);
    if (shouldAward) {
      const ubId = crypto.randomUUID();
      await db.insert(userBadges).values({
        id: ubId,
        userId,
        badgeId: badge.id,
        sessionId: context.sessionId || null,
        earnedAt: new Date(),
      });

      earned.push({
        id: ubId,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        tier: badge.tier,
      });
    }
  }

  return earned;
}

async function checkBadgeCondition(
  badge: typeof badgeDefinitions.$inferSelect,
  userId: string,
  context: EvalContext,
): Promise<boolean> {
  switch (badge.slug) {
    case 'first-blood': {
      if (!context.sessionId) return false;
      const sessionBugs = await db
        .select({ id: bugs.id, reportedBy: bugs.reportedBy })
        .from(bugs)
        .where(eq(bugs.sessionId, context.sessionId))
        .orderBy(bugs.createdAt);
      return sessionBugs.length > 0 && sessionBugs[0].reportedBy === userId;
    }

    case 'bug-hunter': {
      const totalBugsRows = await db
        .select({ count: count() })
        .from(bugs)
        .where(eq(bugs.reportedBy, userId));
      const totalBugs = totalBugsRows[0]?.count ?? 0;
      return totalBugs >= badge.threshold;
    }

    case 'bug-slayer': {
      const totalBugsRows = await db
        .select({ count: count() })
        .from(bugs)
        .where(eq(bugs.reportedBy, userId));
      const totalBugs = totalBugsRows[0]?.count ?? 0;
      return totalBugs >= badge.threshold;
    }

    case 'bug-legend': {
      const totalBugsRows = await db
        .select({ count: count() })
        .from(bugs)
        .where(eq(bugs.reportedBy, userId));
      const totalBugs = totalBugsRows[0]?.count ?? 0;
      return totalBugs >= badge.threshold;
    }

    case 'quality-star': {
      const highQualityRows = await db
        .select({ count: count() })
        .from(bugs)
        .where(and(eq(bugs.reportedBy, userId), sql`${bugs.qualityScore} >= 80`));
      const highQuality = highQualityRows[0]?.count ?? 0;
      return highQuality >= badge.threshold;
    }

    case 'perfectionist': {
      const highQualityRows = await db
        .select({ count: count() })
        .from(bugs)
        .where(and(eq(bugs.reportedBy, userId), sql`${bugs.qualityScore} >= 80`));
      const highQuality = highQualityRows[0]?.count ?? 0;
      return highQuality >= badge.threshold;
    }

    case 'eagle-eye': {
      const blockersRows = await db
        .select({ count: count() })
        .from(bugs)
        .where(and(eq(bugs.reportedBy, userId), eq(bugs.severity, 'blocker')));
      const blockers = blockersRows[0]?.count ?? 0;
      return blockers >= badge.threshold;
    }

    case 'duplicate-detective': {
      const dupesRows = await db
        .select({ count: count() })
        .from(bugs)
        .where(and(eq(bugs.reportedBy, userId), eq(bugs.status, 'duplicate')));
      const dupes = dupesRows[0]?.count ?? 0;
      return dupes >= badge.threshold;
    }

    case 'team-player': {
      const participationsRows = await db
        .select({ count: count() })
        .from(sessionParticipants)
        .where(eq(sessionParticipants.userId, userId));
      const participations = participationsRows[0]?.count ?? 0;
      return participations >= badge.threshold;
    }

    case 'veteran': {
      const participationsRows = await db
        .select({ count: count() })
        .from(sessionParticipants)
        .where(eq(sessionParticipants.userId, userId));
      const participations = participationsRows[0]?.count ?? 0;
      return participations >= badge.threshold;
    }

    case 'streak-3':
    case 'streak-5': {
      const userSessions = await db
        .select({
          sessionId: sessionParticipants.sessionId,
          createdAt: sessions.createdAt,
        })
        .from(sessionParticipants)
        .innerJoin(sessions, eq(sessionParticipants.sessionId, sessions.id))
        .where(eq(sessionParticipants.userId, userId))
        .orderBy(desc(sessions.createdAt));

      return userSessions.length >= badge.threshold;
    }

    case 'script-master': {
      if (!context.sessionId) return false;
      const sessionScripts = await db
        .select({ id: testScripts.id })
        .from(testScripts)
        .where(eq(testScripts.sessionId, context.sessionId));

      for (const script of sessionScripts) {
        const totalStepsRows = await db
          .select({ count: count() })
          .from(testSteps)
          .where(eq(testSteps.scriptId, script.id));
        const totalSteps = totalStepsRows[0]?.count ?? 0;

        if (totalSteps === 0) continue;

        const completedStepsRows = await db
          .select({ count: count() })
          .from(testStepResults)
          .innerJoin(testSteps, eq(testStepResults.stepId, testSteps.id))
          .where(and(
            eq(testSteps.scriptId, script.id),
            eq(testStepResults.userId, userId),
            eq(testStepResults.sessionId, context.sessionId),
          ));
        const completedSteps = completedStepsRows[0]?.count ?? 0;

        if (completedSteps >= totalSteps) return true;
      }
      return false;
    }

    case 'all-rounder': {
      if (!context.sessionId) return false;
      const hasBugRows = await db
        .select({ id: bugs.id })
        .from(bugs)
        .where(and(eq(bugs.reportedBy, userId), eq(bugs.sessionId, context.sessionId)));
      const hasBug = hasBugRows[0];

      const hasStepRows = await db
        .select({ id: testStepResults.id })
        .from(testStepResults)
        .where(and(eq(testStepResults.userId, userId), eq(testStepResults.sessionId, context.sessionId)));
      const hasStep = hasStepRows[0];

      const sessionRows = await db.select({ status: sessions.status }).from(sessions).where(eq(sessions.id, context.sessionId));
      const session = sessionRows[0];
      const isTriaged = session?.status === 'wrapup' || session?.status === 'closed';

      return !!(hasBug && hasStep && isTriaged);
    }

    default:
      return false;
  }
}
