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

export function evaluateBadges(
  userId: string,
  trigger: 'bug_created' | 'script_completed' | 'session_ended' | 'triage_done',
  context: EvalContext = {},
): EarnedBadge[] {
  const earned: EarnedBadge[] = [];

  // Get all badge definitions
  const allBadges = db.select().from(badgeDefinitions).all();

  // Get user's already-earned badge slugs
  const existingBadges = db
    .select({ badgeId: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId))
    .all();
  const earnedBadgeIds = new Set(existingBadges.map(b => b.badgeId));

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    const shouldAward = checkBadgeCondition(badge, userId, context);
    if (shouldAward) {
      const ubId = crypto.randomUUID();
      db.insert(userBadges).values({
        id: ubId,
        userId,
        badgeId: badge.id,
        sessionId: context.sessionId || null,
        earnedAt: new Date(),
      }).run();

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

function checkBadgeCondition(
  badge: typeof badgeDefinitions.$inferSelect,
  userId: string,
  context: EvalContext,
): boolean {
  switch (badge.slug) {
    case 'first-blood': {
      if (!context.sessionId) return false;
      const sessionBugs = db
        .select({ id: bugs.id, reportedBy: bugs.reportedBy })
        .from(bugs)
        .where(eq(bugs.sessionId, context.sessionId))
        .orderBy(bugs.createdAt)
        .all();
      return sessionBugs.length > 0 && sessionBugs[0].reportedBy === userId;
    }

    case 'bug-hunter': {
      const totalBugs = db
        .select({ count: count() })
        .from(bugs)
        .where(eq(bugs.reportedBy, userId))
        .get()!.count;
      return totalBugs >= badge.threshold;
    }

    case 'bug-slayer': {
      const totalBugs = db
        .select({ count: count() })
        .from(bugs)
        .where(eq(bugs.reportedBy, userId))
        .get()!.count;
      return totalBugs >= badge.threshold;
    }

    case 'bug-legend': {
      const totalBugs = db
        .select({ count: count() })
        .from(bugs)
        .where(eq(bugs.reportedBy, userId))
        .get()!.count;
      return totalBugs >= badge.threshold;
    }

    case 'quality-star': {
      const highQuality = db
        .select({ count: count() })
        .from(bugs)
        .where(and(eq(bugs.reportedBy, userId), sql`${bugs.qualityScore} >= 80`))
        .get()!.count;
      return highQuality >= badge.threshold;
    }

    case 'perfectionist': {
      const highQuality = db
        .select({ count: count() })
        .from(bugs)
        .where(and(eq(bugs.reportedBy, userId), sql`${bugs.qualityScore} >= 80`))
        .get()!.count;
      return highQuality >= badge.threshold;
    }

    case 'eagle-eye': {
      const blockers = db
        .select({ count: count() })
        .from(bugs)
        .where(and(eq(bugs.reportedBy, userId), eq(bugs.severity, 'blocker')))
        .get()!.count;
      return blockers >= badge.threshold;
    }

    case 'duplicate-detective': {
      const dupes = db
        .select({ count: count() })
        .from(bugs)
        .where(and(eq(bugs.reportedBy, userId), eq(bugs.status, 'duplicate')))
        .get()!.count;
      return dupes >= badge.threshold;
    }

    case 'team-player': {
      const participations = db
        .select({ count: count() })
        .from(sessionParticipants)
        .where(eq(sessionParticipants.userId, userId))
        .get()!.count;
      return participations >= badge.threshold;
    }

    case 'veteran': {
      const participations = db
        .select({ count: count() })
        .from(sessionParticipants)
        .where(eq(sessionParticipants.userId, userId))
        .get()!.count;
      return participations >= badge.threshold;
    }

    case 'streak-3':
    case 'streak-5': {
      // Get user's sessions ordered by date
      const userSessions = db
        .select({
          sessionId: sessionParticipants.sessionId,
          createdAt: sessions.createdAt,
        })
        .from(sessionParticipants)
        .innerJoin(sessions, eq(sessionParticipants.sessionId, sessions.id))
        .where(eq(sessionParticipants.userId, userId))
        .orderBy(desc(sessions.createdAt))
        .all();

      // For simplicity, count consecutive sessions (by count, not by date gaps)
      return userSessions.length >= badge.threshold;
    }

    case 'script-master': {
      if (!context.sessionId) return false;
      // Check if user completed all steps of any script in this session
      const sessionScripts = db
        .select({ id: testScripts.id })
        .from(testScripts)
        .where(eq(testScripts.sessionId, context.sessionId))
        .all();

      for (const script of sessionScripts) {
        const totalSteps = db
          .select({ count: count() })
          .from(testSteps)
          .where(eq(testSteps.scriptId, script.id))
          .get()!.count;

        if (totalSteps === 0) continue;

        const completedSteps = db
          .select({ count: count() })
          .from(testStepResults)
          .innerJoin(testSteps, eq(testStepResults.stepId, testSteps.id))
          .where(and(
            eq(testSteps.scriptId, script.id),
            eq(testStepResults.userId, userId),
            eq(testStepResults.sessionId, context.sessionId),
          ))
          .get()!.count;

        if (completedSteps >= totalSteps) return true;
      }
      return false;
    }

    case 'all-rounder': {
      if (!context.sessionId) return false;
      // Reported bug in session
      const hasBug = db
        .select({ id: bugs.id })
        .from(bugs)
        .where(and(eq(bugs.reportedBy, userId), eq(bugs.sessionId, context.sessionId)))
        .get();

      // Completed test script step
      const hasStep = db
        .select({ id: testStepResults.id })
        .from(testStepResults)
        .where(and(eq(testStepResults.userId, userId), eq(testStepResults.sessionId, context.sessionId)))
        .get();

      // Participated in triage (has comments on session bugs, or session is in wrapup/closed)
      // Simple check: user made a comment on a bug in this session
      const session = db.select({ status: sessions.status }).from(sessions).where(eq(sessions.id, context.sessionId)).get();
      const isTriaged = session?.status === 'wrapup' || session?.status === 'closed';

      return !!(hasBug && hasStep && isTriaged);
    }

    default:
      return false;
  }
}
