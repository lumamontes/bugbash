import type { APIRoute } from 'astro';
import { requireSessionContext } from '@lib/services/helpers';
import { getBugInSession, addComment } from '@lib/services/bugs';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const bug = await getBugInSession(params.bugId!, params.id!);
  if (!bug) return new Response('Not found', { status: 404 });

  const formData = await request.formData();
  const content = formData.get('content')?.toString()?.trim();

  if (!content) {
    return redirect(`/sessions/${params.id}/bugs/${params.bugId}`);
  }

  await addComment(params.bugId!, ctx.user.id, content);

  return redirect(`/sessions/${params.id}/bugs/${params.bugId}`);
};
