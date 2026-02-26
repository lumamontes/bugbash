import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { squads } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const method = form.get('_method')?.toString();

  if (method === 'DELETE') {
    const squadId = form.get('squadId')?.toString();
    if (!squadId) return new Response('Missing squadId', { status: 400 });

    const squad = (await db.select().from(squads).where(eq(squads.id, squadId)))[0];
    if (!squad || squad.orgId !== user.orgId) return new Response('Not found', { status: 404 });

    await db.delete(squads).where(eq(squads.id, squadId));
    return redirect('/settings', 303);
  }

  const name = form.get('name')?.toString()?.trim();
  if (!name) return redirect('/settings', 303);

  await db.insert(squads).values({
    id: crypto.randomUUID(),
    name,
    orgId: user.orgId,
    createdAt: new Date(),
  });

  return redirect('/settings', 303);
};
