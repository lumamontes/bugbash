import type { APIRoute } from 'astro';
import { requireSessionContext } from '@lib/services/helpers';
import { addCredential } from '@lib/services/sessions';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const formData = await request.formData();
  const profileType = formData.get('profileType')?.toString()?.trim();
  const username = formData.get('username')?.toString()?.trim();
  const password = formData.get('password')?.toString()?.trim();
  const environment = formData.get('environment')?.toString()?.trim() || null;

  if (!profileType || !username || !password) {
    return redirect(`/sessions/${params.id}?error=missing_fields`);
  }

  await addCredential(params.id!, { profileType, username, password, environment });

  return redirect(`/sessions/${params.id}`);
};
