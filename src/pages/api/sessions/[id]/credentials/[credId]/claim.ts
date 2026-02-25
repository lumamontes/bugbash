import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testCredentials } from '@db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const contentType = request.headers.get('content-type') || '';

  // Handle form-based DELETE (release)
  if (!contentType.includes('application/json')) {
    const formData = await request.formData();
    const method = formData.get('_method')?.toString();

    if (method === 'DELETE') {
      db.update(testCredentials).set({ claimedBy: null }).where(eq(testCredentials.id, params.credId!)).run();
      return redirect(`/sessions/${params.id}`);
    }
  }

  // Claim
  const cred = db.select().from(testCredentials).where(eq(testCredentials.id, params.credId!)).get();
  if (!cred || cred.sessionId !== params.id) return new Response('Not found', { status: 404 });

  if (cred.claimedBy) {
    return redirect(`/sessions/${params.id}?error=already_claimed`);
  }

  db.update(testCredentials).set({ claimedBy: user.id }).where(eq(testCredentials.id, params.credId!)).run();

  return redirect(`/sessions/${params.id}`);
};
