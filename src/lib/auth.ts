import { db } from '@db/index';
import { authSessions, users } from '@db/schema';
import { eq, and, gt, like, count } from 'drizzle-orm';
import crypto from 'node:crypto';

export const SESSION_COOKIE = 'bugbash_token';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const ALLOWED_DOMAINS = [
  'arcotech.io',
  'arcoeducacao.com.br',
  'geekie.com.br',
  'geekie.com',
];

export function getAuthMode(): 'local' | 'keycloak' {
  const mode = import.meta.env.AUTH_MODE || process.env.AUTH_MODE || 'local';
  return mode === 'keycloak' ? 'keycloak' : 'local';
}

export function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return ALLOWED_DOMAINS.includes(domain);
}

export function getUserCount(): number {
  const result = db.select({ value: count() }).from(users).get();
  return result?.value ?? 0;
}

export function loginByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).get();
}

export function createSession(userId: string): string {
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  db.insert(authSessions).values({
    id,
    userId,
    expiresAt,
    createdAt: now,
  }).run();

  return id;
}

export function createSessionWithKeycloak(
  userId: string,
  accessToken: string,
  refreshToken: string,
  tokenExpiresIn: number,
): string {
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  const tokenExpiresAt = new Date(now.getTime() + tokenExpiresIn * 1000);

  db.insert(authSessions).values({
    id,
    userId,
    keycloakAccessToken: accessToken,
    keycloakRefreshToken: refreshToken,
    keycloakTokenExpiresAt: tokenExpiresAt,
    expiresAt,
    createdAt: now,
  }).run();

  return id;
}

export function validateSession(sessionId: string) {
  const now = new Date();

  const result = db
    .select({
      sessionId: authSessions.id,
      expiresAt: authSessions.expiresAt,
      keycloakRefreshToken: authSessions.keycloakRefreshToken,
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
    ))
    .get();

  if (!result) {
    // Clean up this expired session
    db.delete(authSessions).where(eq(authSessions.id, sessionId)).run();
    return null;
  }

  return {
    session: {
      id: result.sessionId,
      expiresAt: result.expiresAt,
      keycloakRefreshToken: result.keycloakRefreshToken,
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

export function deleteSession(sessionId: string): void {
  db.delete(authSessions).where(eq(authSessions.id, sessionId)).run();
}
