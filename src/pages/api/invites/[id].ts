import type { APIRoute } from 'astro';
import { deactivateInvite } from '@lib/auth/invites';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user || (user.role !== 'admin' && user.role !== 'facilitator')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  await deactivateInvite(id);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
