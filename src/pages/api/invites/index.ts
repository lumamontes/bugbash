import type { APIRoute } from 'astro';
import { listInvites, createInvite } from '@lib/auth/invites';

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || (user.role !== 'admin' && user.role !== 'facilitator')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const invites = await (user.role === 'admin' ? listInvites() : listInvites(user.id));

  return new Response(JSON.stringify(invites), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || (user.role !== 'admin' && user.role !== 'facilitator')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const role = body.role || 'participant';
  const maxUses = body.maxUses ?? 0;
  const expiresInDays = body.expiresInDays;

  let expiresAt: Date | null = null;
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  const invite = await createInvite({
    createdBy: user.id,
    role,
    maxUses,
    expiresAt,
  });

  return new Response(JSON.stringify(invite), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
