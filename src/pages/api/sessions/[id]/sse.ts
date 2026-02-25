import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, bugs, users, userBadges, badgeDefinitions } from '@db/schema';
import { eq, desc, gt, and } from 'drizzle-orm';

export const GET: APIRoute = async ({ params, locals, request }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const encoder = new TextEncoder();
  let lastChecked = new Date();
  let lastBadgeChecked = new Date();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(': heartbeat\n\n'));

      const interval = setInterval(() => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          // Check for new bugs since last check
          const newBugs = db
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
            .where(eq(bugs.sessionId, params.id!))
            .orderBy(desc(bugs.createdAt))
            .all()
            .filter(b => b.createdAt > lastChecked);

          if (newBugs.length > 0) {
            lastChecked = new Date();
            const data = JSON.stringify(newBugs);
            controller.enqueue(encoder.encode(`event: bugs\ndata: ${data}\n\n`));
          }

          // Send bug count update
          const totalCount = db
            .select({ id: bugs.id })
            .from(bugs)
            .where(eq(bugs.sessionId, params.id!))
            .all().length;

          controller.enqueue(encoder.encode(`event: count\ndata: ${totalCount}\n\n`));

          // Check session status
          const currentSession = db.select({ status: sessions.status }).from(sessions).where(eq(sessions.id, params.id!)).get();
          if (currentSession) {
            controller.enqueue(encoder.encode(`event: status\ndata: ${currentSession.status}\n\n`));
          }

          // Check for recently earned badges for current user
          const recentBadges = db
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
              eq(userBadges.userId, user.id),
              gt(userBadges.earnedAt, lastBadgeChecked),
            ))
            .all();

          if (recentBadges.length > 0) {
            lastBadgeChecked = new Date();
            controller.enqueue(encoder.encode(`event: badge\ndata: ${JSON.stringify(recentBadges)}\n\n`));
          }
        } catch {
          clearInterval(interval);
          try { controller.close(); } catch {}
        }
      }, 3000);

      // Cleanup on abort
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
