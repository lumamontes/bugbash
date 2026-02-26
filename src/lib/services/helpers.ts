import { db } from '@db/index';
import { sessions } from '@db/schema';
import { eq } from 'drizzle-orm';

interface UserLocals {
  id: string;
  name: string;
  email: string;
  role: string;
  orgId: string;
  squadId: string | null;
}

/**
 * Extract user from Astro locals or return a 401 Response.
 */
export function requireUser(locals: { user?: UserLocals | null }): UserLocals | Response {
  if (!locals.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  return locals.user;
}

/**
 * Fetch a session by ID, returning null if not found or org mismatch.
 */
export async function getSessionOrNull(sessionId: string, orgId: string) {
  const session = (await db.select().from(sessions).where(eq(sessions.id, sessionId)))[0];
  if (!session || session.orgId !== orgId) return null;
  return session;
}

/**
 * Auth + session validation guard for API routes.
 * Returns { user, session } on success, or { error: Response } on failure.
 */
export async function requireSessionContext(
  locals: { user?: UserLocals | null },
  sessionId: string,
): Promise<{ user: UserLocals; session: typeof sessions.$inferSelect; error?: never } | { error: Response; user?: never; session?: never }> {
  const user = requireUser(locals);
  if (user instanceof Response) return { error: user };

  const session = await getSessionOrNull(sessionId, user.orgId);
  if (!session) return { error: new Response('Not found', { status: 404 }) };

  return { user, session };
}
