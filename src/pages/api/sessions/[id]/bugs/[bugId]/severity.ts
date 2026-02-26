import type { APIRoute } from 'astro';
import { requireSessionContext } from '@lib/services/helpers';
import { getBugInSession, updateSeverity } from '@lib/services/bugs';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const bug = await getBugInSession(params.bugId!, params.id!);
  if (!bug) return new Response('Not found', { status: 404 });

  const body = await request.json();
  const error = await updateSeverity(params.bugId!, body.severity);

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
