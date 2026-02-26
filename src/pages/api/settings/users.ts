import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { users } from '@db/schema';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const name = form.get('name')?.toString()?.trim();
  const email = form.get('email')?.toString()?.trim()?.toLowerCase();
  const role = form.get('role')?.toString() as 'participant' | 'facilitator' | 'admin';
  if (!name || !email) {
    return redirect('/settings', 303);
  }

  await db.insert(users).values({
    id: crypto.randomUUID(),
    name,
    email,
    role: role || 'participant',
    orgId: user.orgId,
    createdAt: new Date(),
  });

  return redirect('/settings', 303);
};
