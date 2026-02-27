import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, bugs, users, userBadges, badgeDefinitions } from '@db/schema';
import { eq, desc, gt, and, count } from 'drizzle-orm';
import { requireSessionContext } from '@lib/services/helpers';

export const GET: APIRoute = async ({ params, locals, request }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const encoder = new TextEncoder();
  let lastChecked = new Date();
  let lastBadgeChecked = new Date();
  let lastCount = -1;
  let lastStatus = '';
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(': heartbeat\n\n'));

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          // 1. Only fetch bugs created after last check (not all bugs)
          const newBugs = await db
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
            .where(and(
              eq(bugs.sessionId, params.id!),
              gt(bugs.createdAt, lastChecked),
            ))
            .orderBy(desc(bugs.createdAt));

          if (newBugs.length > 0) {
            lastChecked = new Date();
            controller.enqueue(encoder.encode(`event: bugs\ndata: ${JSON.stringify(newBugs)}\n\n`));
          }

          // 2. Use SQL count() instead of fetching all rows
          const [{ total }] = await db
            .select({ total: count() })
            .from(bugs)
            .where(eq(bugs.sessionId, params.id!));

          // Only send count when it changes
          if (total !== lastCount) {
            lastCount = total;
            controller.enqueue(encoder.encode(`event: count\ndata: ${total}\n\n`));
          }

          // 3. Only send status when it changes
          const [currentSession] = await db
            .select({ status: sessions.status })
            .from(sessions)
            .where(eq(sessions.id, params.id!));

          if (currentSession && currentSession.status !== lastStatus) {
            lastStatus = currentSession.status;
            controller.enqueue(encoder.encode(`event: status\ndata: ${currentSession.status}\n\n`));
          }

          // 4. Badges — already filtered by timestamp, keep as-is
          const recentBadges = await db
            .select({
              id: userBadges.id,
              earnedAt: userBadges.earnedAt,
              slug: badgeDefinitions.slug,
              name: badgeDefinitions.name,
              description: badgeDefinitions.description,
              icon: badgeDefinitions.icon,
              tier: badgeDefinitions.tier,
            })
            .from(userBadges)
            .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
            .where(and(
              eq(userBadges.userId, ctx.user.id),
              gt(userBadges.earnedAt, lastBadgeChecked),
            ));

          if (recentBadges.length > 0) {
            lastBadgeChecked = new Date();
            controller.enqueue(encoder.encode(`event: badge\ndata: ${JSON.stringify(recentBadges)}\n\n`));
          }
        } catch {
          clearInterval(interval);
          try { controller.close(); } catch {}
        }
      }, 5000);

      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
