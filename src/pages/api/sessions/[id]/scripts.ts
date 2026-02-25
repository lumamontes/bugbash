import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, testScripts, testSteps } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const formData = await request.formData();
  const title = formData.get('title')?.toString()?.trim();
  if (!title) return redirect(`/sessions/${params.id}/scripts/new?error=missing_title`);

  const description = formData.get('description')?.toString()?.trim() || null;
  const stepsRaw = formData.get('steps')?.toString()?.trim() || '';

  // Get max order index
  const maxOrder = db.select({ max: sql<number>`COALESCE(MAX(order_index), -1)` })
    .from(testScripts)
    .where(eq(testScripts.sessionId, params.id!))
    .get()!.max;

  const scriptId = crypto.randomUUID();
  db.insert(testScripts).values({
    id: scriptId,
    sessionId: params.id!,
    title,
    description,
    orderIndex: maxOrder + 1,
    createdAt: new Date(),
  }).run();

  // Parse steps
  if (stepsRaw) {
    const lines = stepsRaw.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach((line, idx) => {
      const [instruction, expectedResult] = line.split('|').map(s => s.trim());
      if (instruction) {
        db.insert(testSteps).values({
          id: crypto.randomUUID(),
          scriptId,
          instruction,
          expectedResult: expectedResult || null,
          orderIndex: idx,
        }).run();
      }
    });
  }

  return redirect(`/sessions/${params.id}`);
};
