import type { APIRoute } from 'astro';
import { requireSessionContext } from '@lib/services/helpers';
import { transitionStatus } from '@lib/services/sessions';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const body = await request.json();
  const error = await transitionStatus(params.id!, ctx.session.status, body.status);

  if (error) {
    return new Response(JSON.stringify({ error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
