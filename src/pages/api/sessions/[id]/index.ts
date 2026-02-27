import type { APIRoute } from 'astro';
import { requireSessionContext } from '@lib/services/helpers';
import { updateSession, restartPhase } from '@lib/services/sessions';

/** PUT — edit session properties (admin/facilitator). */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const { role } = ctx.user;
  if (role !== 'admin' && role !== 'facilitator') {
    return new Response(JSON.stringify({ error: 'Sem permissão' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (typeof body.kickoffDuration === 'number') data.kickoffDuration = body.kickoffDuration;
  if (typeof body.executionDuration === 'number') data.executionDuration = body.executionDuration;
  if (typeof body.wrapupDuration === 'number') data.wrapupDuration = body.wrapupDuration;

  if (Object.keys(data).length === 0) {
    return new Response(JSON.stringify({ error: 'Nenhum campo para atualizar' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await updateSession(params.id!, data);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

/** PATCH — phase restart (admin only). */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  if (ctx.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Apenas administradores podem reiniciar fases' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  if (body.action !== 'restart' || !body.targetStatus) {
    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const error = await restartPhase(params.id!, ctx.session.status, body.targetStatus);
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
