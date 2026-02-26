import type { APIRoute } from 'astro';
import { requireUser } from '@lib/services/helpers';
import { createSession } from '@lib/services/sessions';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = requireUser(locals);
  if (user instanceof Response) return user;

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

  const id = await createSession(
    { title, description, scheduledAt, kickoffDuration, executionDuration, wrapupDuration },
    user,
  );

  return redirect(`/sessions/${id}`);
};
