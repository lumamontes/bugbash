import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, bugs, bugComments } from '@db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const bug = db.select().from(bugs).where(eq(bugs.id, params.bugId!)).get();
  if (!bug || bug.sessionId !== params.id) return new Response('Not found', { status: 404 });

  const formData = await request.formData();
  const content = formData.get('content')?.toString()?.trim();

  if (!content) {
    return redirect(`/sessions/${params.id}/bugs/${params.bugId}`);
  }

  db.insert(bugComments).values({
    id: crypto.randomUUID(),
    bugId: params.bugId!,
    userId: user.id,
    content,
    createdAt: new Date(),
  }).run();

  return redirect(`/sessions/${params.id}/bugs/${params.bugId}`);
};
