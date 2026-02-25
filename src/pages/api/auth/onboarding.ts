import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return redirect('/login');

  const formData = await request.formData();
  const squadId = formData.get('squadId')?.toString();

  if (!squadId) {
    return redirect('/onboarding?error=missing_squad');
  }

  db.update(users)
    .set({ squadId, onboardingComplete: true })
    .where(eq(users.id, user.id))
    .run();

  return redirect('/');
};
