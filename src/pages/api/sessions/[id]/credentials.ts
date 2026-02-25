import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testCredentials } from '@db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const formData = await request.formData();
  const profileType = formData.get('profileType')?.toString()?.trim();
  const username = formData.get('username')?.toString()?.trim();
  const password = formData.get('password')?.toString()?.trim();
  const environment = formData.get('environment')?.toString()?.trim() || null;

  if (!profileType || !username || !password) {
    return redirect(`/sessions/${params.id}?error=missing_fields`);
  }

  db.insert(testCredentials).values({
    id: crypto.randomUUID(),
    sessionId: params.id!,
    profileType,
    username,
    password,
    environment,
    createdAt: new Date(),
  }).run();

  return redirect(`/sessions/${params.id}`);
};
