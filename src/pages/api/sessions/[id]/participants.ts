import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, sessionParticipants } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

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
        db.delete(sessionParticipants)
          .where(and(
            eq(sessionParticipants.sessionId, params.id!),
            eq(sessionParticipants.userId, userId),
          ))
          .run();
      }
      return redirect(`/sessions/${params.id}`);
    }
    userId = formData.get('userId')?.toString();
  }

  if (!userId) {
    return new Response('Missing userId', { status: 400 });
  }

  // Check if already a participant
  const existing = db.select().from(sessionParticipants)
    .where(and(eq(sessionParticipants.sessionId, params.id!), eq(sessionParticipants.userId, userId)))
    .get();

  if (!existing) {
    db.insert(sessionParticipants).values({
      id: crypto.randomUUID(),
      sessionId: params.id!,
      userId,
      joinedAt: new Date(),
    }).run();
  }

  if (contentType.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect(`/sessions/${params.id}`);
};
