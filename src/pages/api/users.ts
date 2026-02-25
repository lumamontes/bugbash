import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const orgUsers = db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.orgId, user.orgId))
    .all();

  return new Response(JSON.stringify(orgUsers), {
    headers: { 'Content-Type': 'application/json' },
  });
};
