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
  const squadId = form.get('squadId')?.toString() || null;

  if (!name || !email) {
    return redirect('/settings', 303);
  }

  db.insert(users).values({
    id: crypto.randomUUID(),
    name,
    email,
    role: role || 'participant',
    orgId: user.orgId,
    squadId,
    createdAt: new Date(),
  }).run();

  return redirect('/settings', 303);
};
