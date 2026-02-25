import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, bugs } from '@db/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ params, url, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const query = url.searchParams.get('q')?.trim();
  if (!query || query.length < 3) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Simple LIKE-based search (trigram would require extension)
  // Split query into words and search for each
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);

  const allBugs = db
    .select({ id: bugs.id, title: bugs.title, severity: bugs.severity, status: bugs.status })
    .from(bugs)
    .where(eq(bugs.sessionId, params.id!))
    .all();

  // Score each bug by how many query words match
  const matches = allBugs
    .map(bug => {
      const titleLower = bug.title.toLowerCase();
      const matchCount = words.filter(w => titleLower.includes(w)).length;
      return { ...bug, matchCount };
    })
    .filter(b => b.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 5);

  return new Response(JSON.stringify(matches), {
    headers: { 'Content-Type': 'application/json' },
  });
};
