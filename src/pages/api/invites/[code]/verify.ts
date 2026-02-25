import type { APIRoute } from 'astro';
import { verifyInvite } from '@lib/auth/invites';

export const GET: APIRoute = async ({ params }) => {
  const { code } = params;
  if (!code) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const invite = verifyInvite(code);

  if (!invite) {
    return new Response(JSON.stringify({ valid: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    valid: true,
    role: invite.role,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
