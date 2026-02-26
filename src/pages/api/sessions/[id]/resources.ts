import type { APIRoute } from 'astro';
import { requireSessionContext } from '@lib/services/helpers';
import { addTestResource } from '@lib/services/sessions';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const formData = await request.formData();
  const label = formData.get('label')?.toString()?.trim();
  const value = formData.get('value')?.toString()?.trim();
  const group = formData.get('group')?.toString()?.trim() || null;

  if (!label || !value) {
    return redirect(`/sessions/${params.id}?error=missing_fields`);
  }

  await addTestResource(params.id!, { label, value, group });

  return redirect(`/sessions/${params.id}`);
};
