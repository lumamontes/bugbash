import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { tags } from '@db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const method = form.get('_method')?.toString();

  if (method === 'DELETE') {
    const tagId = form.get('tagId')?.toString();
    if (!tagId) return new Response('Missing tagId', { status: 400 });

    const tag = db.select().from(tags).where(eq(tags.id, tagId)).get();
    if (!tag || tag.orgId !== user.orgId) return new Response('Not found', { status: 404 });

    db.delete(tags).where(eq(tags.id, tagId)).run();
    return redirect('/settings', 303);
  }

  const name = form.get('name')?.toString()?.trim();
  const color = form.get('color')?.toString() || '#6366f1';
  if (!name) return redirect('/settings', 303);

  db.insert(tags).values({
    id: crypto.randomUUID(),
    name,
    color,
    orgId: user.orgId,
  }).run();

  return redirect('/settings', 303);
};
