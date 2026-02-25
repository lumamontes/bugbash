import type { APIRoute } from 'astro';
import { SESSION_COOKIE, deleteSession, getAuthMode } from '@lib/auth';
import { revokeSession } from '@lib/auth/keycloak';

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    // Revoke Keycloak session if applicable
    if (getAuthMode() === 'keycloak' && locals.session?.keycloakRefreshToken) {
      await revokeSession(locals.session.keycloakRefreshToken);
    }

    deleteSession(sessionId);
  }

  cookies.delete(SESSION_COOKIE, { path: '/' });

  return redirect('/entrar');
};
