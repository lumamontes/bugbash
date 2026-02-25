import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { loginByEmail, createSession, createSessionWithKeycloak, getAuthMode, SESSION_COOKIE } from '@lib/auth';
import { exchangeCredentials, mapKeycloakRole } from '@lib/auth/keycloak';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString()?.trim()?.toLowerCase();
  const password = formData.get('password')?.toString();

  if (!email) {
    return redirect('/entrar?error=missing_fields');
  }

  const authMode = getAuthMode();

  // Keycloak path (kept for future use)
  if (authMode === 'keycloak' && password) {
    return handleKeycloakLogin(email, password, cookies, redirect);
  }

  // Email-only login
  return handleEmailLogin(email, cookies, redirect);
};

async function handleEmailLogin(
  email: string,
  cookies: any,
  redirect: (path: string, status?: number) => Response,
) {
  const user = loginByEmail(email);

  if (!user) {
    return redirect('/entrar?error=invalid_credentials');
  }

  const sessionId = createSession(user.id);

  cookies.set(SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 30 * 24 * 60 * 60,
  });

  return redirect('/');
}

async function handleKeycloakLogin(
  email: string,
  password: string,
  cookies: any,
  redirect: (path: string, status?: number) => Response,
) {
  try {
    const { tokens, userInfo } = await exchangeCredentials(email, password);
    const role = mapKeycloakRole(userInfo.roles);

    let user = db.select().from(users).where(eq(users.email, userInfo.email)).get();
    let isFirstLogin = false;

    if (!user) {
      const { organizations } = await import('@db/schema');
      const org = db.select().from(organizations).get();
      if (!org) {
        return redirect('/entrar?error=keycloak_error');
      }

      const userId = crypto.randomUUID();
      isFirstLogin = true;

      db.insert(users).values({
        id: userId,
        name: userInfo.name || userInfo.email.split('@')[0],
        email: userInfo.email,
        keycloakSub: userInfo.sub,
        onboardingComplete: false,
        role,
        orgId: org.id,
        createdAt: new Date(),
      }).run();

      user = db.select().from(users).where(eq(users.id, userId)).get()!;
    } else {
      if (!user.keycloakSub) {
        db.update(users)
          .set({ keycloakSub: userInfo.sub, role })
          .where(eq(users.id, user.id))
          .run();
      }
    }

    const sessionId = createSessionWithKeycloak(
      user.id,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
    );

    cookies.set(SESSION_COOKIE, sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 30 * 24 * 60 * 60,
    });

    if (isFirstLogin || !user.onboardingComplete) {
      return redirect('/onboarding');
    }

    return redirect('/');
  } catch (err) {
    console.error('Keycloak login error:', err);
    return redirect('/entrar?error=invalid_credentials');
  }
}
