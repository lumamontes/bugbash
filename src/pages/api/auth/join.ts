import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { createSession, SESSION_COOKIE } from '@lib/auth';
import { verifyInvite, incrementInviteUsage } from '@lib/auth/invites';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const code = formData.get('code')?.toString()?.trim();
  const name = formData.get('name')?.toString()?.trim();
  const email = formData.get('email')?.toString()?.trim()?.toLowerCase();
  if (!code || !name || !email) {
    return redirect(`/convite/${code}?error=missing_fields`);
  }

  const invite = await verifyInvite(code);
  if (!invite) {
    return redirect(`/convite/${code}?error=invite_invalid`);
  }

  // Check if email already exists
  const existingRows = await db.select().from(users).where(eq(users.email, email));
  if (existingRows[0]) {
    return redirect(`/convite/${code}?error=email_exists`);
  }

  // Get creator's org
  const creatorRows = await db.select().from(users).where(eq(users.id, invite.createdBy));
  const creator = creatorRows[0];
  if (!creator) {
    return redirect(`/convite/${code}?error=invite_invalid`);
  }

  const userId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    name,
    email,
    role: invite.role,
    orgId: creator.orgId,
    createdAt: new Date(),
  });

  await incrementInviteUsage(invite.id);

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
