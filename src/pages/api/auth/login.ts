import type { APIRoute } from 'astro';
import { loginByEmail, createSession, SESSION_COOKIE } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString()?.trim()?.toLowerCase();

  if (!email) {
    return redirect('/entrar?error=missing_fields');
  }

  const user = await loginByEmail(email);

  if (!user) {
    return redirect('/entrar?error=invalid_credentials');
  }

  const sessionId = await createSession(user.id);

  cookies.set(SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 30 * 24 * 60 * 60,
  });

  return redirect('/');
};
