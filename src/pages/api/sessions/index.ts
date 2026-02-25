import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions } from '@db/schema';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const title = formData.get('title')?.toString()?.trim();

  if (!title) {
    return redirect('/sessions/new?error=missing_title');
  }

  const description = formData.get('description')?.toString()?.trim() || null;
  const scheduledAtStr = formData.get('scheduledAt')?.toString();
  const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : null;
  const kickoffDuration = parseInt(formData.get('kickoffDuration')?.toString() || '15', 10);
  const executionDuration = parseInt(formData.get('executionDuration')?.toString() || '60', 10);
  const wrapupDuration = parseInt(formData.get('wrapupDuration')?.toString() || '15', 10);

  const id = crypto.randomUUID();
  const now = new Date();

  db.insert(sessions).values({
    id,
    title,
    description,
    status: 'draft',
    orgId: user.orgId,
    createdBy: user.id,
    scheduledAt,
    kickoffDuration,
    executionDuration,
    wrapupDuration,
    createdAt: now,
  }).run();

  return redirect(`/sessions/${id}`);
};
