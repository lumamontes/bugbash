import type { APIRoute } from 'astro';
import { requireSessionContext } from '@lib/services/helpers';
import { addParticipant, removeParticipant } from '@lib/services/sessions';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const contentType = request.headers.get('content-type') || '';
  let userId: string | undefined;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    userId = body.userId;
  } else {
    const formData = await request.formData();
    const method = formData.get('_method')?.toString();

    if (method === 'DELETE') {
      userId = formData.get('userId')?.toString();
      if (userId) {
        await removeParticipant(params.id!, userId);
      }
      return redirect(`/sessions/${params.id}`);
    }
    userId = formData.get('userId')?.toString();
  }

  if (!userId) {
    return new Response('Missing userId', { status: 400 });
  }

  await addParticipant(params.id!, userId);

  if (contentType.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect(`/sessions/${params.id}`);
};
