import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { testCredentials } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireSessionContext } from '@lib/services/helpers';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const contentType = request.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const formData = await request.formData();
    const method = formData.get('_method')?.toString();

    if (method === 'DELETE') {
      await db.update(testCredentials).set({ claimedBy: null }).where(eq(testCredentials.id, params.credId!));
      return redirect(`/sessions/${params.id}`);
    }
  }

  const cred = (await db.select().from(testCredentials).where(eq(testCredentials.id, params.credId!)))[0];
  if (!cred || cred.sessionId !== params.id) return new Response('Not found', { status: 404 });

  if (cred.claimedBy) {
    return redirect(`/sessions/${params.id}?error=already_claimed`);
  }

  await db.update(testCredentials).set({ claimedBy: ctx.user.id }).where(eq(testCredentials.id, params.credId!));

  return redirect(`/sessions/${params.id}`);
};
