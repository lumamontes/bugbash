import { db } from '@db/index';
import { authSessions, users } from '@db/schema';
import { eq, and, gt, count } from 'drizzle-orm';
import crypto from 'node:crypto';

export const SESSION_COOKIE = 'bugbash_token';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const ALLOWED_DOMAINS = [
  'arcotech.io',
  'arcoeducacao.com.br',
  'geekie.com.br',
  'geekie.com',
];

export function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return ALLOWED_DOMAINS.includes(domain);
}

export async function getUserCount(): Promise<number> {
  const rows = await db.select({ value: count() }).from(users);
  return rows[0]?.value ?? 0;
}

export async function loginByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
  return rows[0];
}

export async function createSession(userId: string): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  await db.insert(authSessions).values({
    id,
    userId,
    expiresAt,
    createdAt: now,
  });

  return id;
}

export async function validateSession(sessionId: string) {
  const now = new Date();

  const rows = await db
    .select({
      sessionId: authSessions.id,
      expiresAt: authSessions.expiresAt,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      userOrgId: users.orgId,
      userSquadId: users.squadId,
      onboardingComplete: users.onboardingComplete,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(
      eq(authSessions.id, sessionId),
      gt(authSessions.expiresAt, now),
    ));

  const result = rows[0];

  if (!result) {
    await db.delete(authSessions).where(eq(authSessions.id, sessionId));
    return null;
  }

  return {
    session: {
      id: result.sessionId,
      expiresAt: result.expiresAt,
    },
    user: {
      id: result.userId,
      name: result.userName,
      email: result.userEmail,
      role: result.userRole as 'facilitator' | 'participant' | 'admin',
      orgId: result.userOrgId,
      squadId: result.userSquadId,
      onboardingComplete: result.onboardingComplete ?? true,
    },
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.id, sessionId));
}
