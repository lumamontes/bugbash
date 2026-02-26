import type { APIRoute } from 'astro';
import { evaluateBadges } from '@lib/gamification';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const trigger = body.trigger || 'bug_created';
  const context = body.context || {};

  const earned = await evaluateBadges(user.id, trigger, context);

  return new Response(JSON.stringify({ earned }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
