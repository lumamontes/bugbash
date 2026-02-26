import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { organizations, users } from '@db/schema';
import { getUserCount, createSession, SESSION_COOKIE } from '@lib/auth';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // Only allow setup if no users exist
  if ((await getUserCount()) > 0) {
    return redirect('/entrar');
  }

  const formData = await request.formData();
  const orgName = formData.get('orgName')?.toString()?.trim();
  const name = formData.get('name')?.toString()?.trim();
  const email = formData.get('email')?.toString()?.trim()?.toLowerCase();

  if (!orgName || !name || !email) {
    return redirect('/setup?error=missing_fields');
  }

  if (!email.includes('@')) {
    return redirect('/setup?error=email_invalid');
  }

  const now = new Date();
  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  // Create organization
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await db.insert(organizations).values({
    id: orgId,
    name: orgName,
    slug,
    createdAt: now,
  });

  // Create admin user
  await db.insert(users).values({
    id: userId,
    name,
    email,
    role: 'admin',
    isFirstUser: true,
    orgId,
    createdAt: now,
  });

  // Create session
  const sessionId = await createSession(userId);

  cookies.set(SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 30 * 24 * 60 * 60,
  });

  return redirect('/');
};
