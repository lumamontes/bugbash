import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ locals, redirect }) => {
  const user = locals.user;
  if (!user) return redirect('/login');

  await db.update(users)
    .set({ onboardingComplete: true })
    .where(eq(users.id, user.id));

  return redirect('/');
};
