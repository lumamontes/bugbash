import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, validateSession, getUserCount } from '@lib/auth';

const PUBLIC_PATHS = [
  '/login',
  '/entrar',
  '/setup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/setup',
  '/api/auth/join',
  '/api/users/search',
];

const PUBLIC_PREFIXES = [
  '/_astro/',
  '/favicon',
  '/convite/',
  '/api/invites/',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Allow static assets and public paths
  if (isPublicPath(pathname)) {
    context.locals.user = null;
    context.locals.session = null;
    return next();
  }

  // Zero users → redirect to setup
  const userCount = getUserCount();
  if (userCount === 0) {
    return context.redirect('/setup');
  }

  const sessionId = context.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return context.redirect('/entrar');
  }

  const result = validateSession(sessionId);

  if (!result) {
    context.cookies.delete(SESSION_COOKIE, { path: '/' });
    return context.redirect('/entrar');
  }

  context.locals.user = result.user;
  context.locals.session = result.session;

  // Redirect participants away from admin/facilitator pages
  if (result.user.role === 'participant') {
    const restrictedPaths = ['/', '/analytics', '/settings', '/guide', '/sessions/new'];
    if (restrictedPaths.includes(pathname)) {
      return context.redirect('/sessions');
    }
  }

  // Redirect to onboarding if not complete (except onboarding paths)
  if (!result.user.onboardingComplete && pathname !== '/onboarding' && !pathname.startsWith('/api/auth/onboarding')) {
    return context.redirect('/onboarding');
  }

  return next();
});
