import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { testScripts, testSteps } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireSessionContext } from '@lib/services/helpers';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const formData = await request.formData();
  const title = formData.get('title')?.toString()?.trim();
  if (!title) return redirect(`/sessions/${params.id}/scripts/new?error=missing_title`);

  const description = formData.get('description')?.toString()?.trim() || null;
  const stepsRaw = formData.get('steps')?.toString()?.trim() || '';

  const maxOrder = (await db.select({ max: sql<number>`COALESCE(MAX(order_index), -1)` })
    .from(testScripts)
    .where(eq(testScripts.sessionId, params.id!)))[0]!.max;

  const scriptId = crypto.randomUUID();
  await db.insert(testScripts).values({
    id: scriptId,
    sessionId: params.id!,
    title,
    description,
    orderIndex: maxOrder + 1,
    createdAt: new Date(),
  });

  if (stepsRaw) {
    const lines = stepsRaw.split('\n').map(l => l.trim()).filter(Boolean);
    for (let idx = 0; idx < lines.length; idx++) {
      const [instruction, expectedResult] = lines[idx].split('|').map(s => s.trim());
      if (instruction) {
        await db.insert(testSteps).values({
          id: crypto.randomUUID(),
          scriptId,
          instruction,
          expectedResult: expectedResult || null,
          orderIndex: idx,
        });
      }
    }
  }

  return redirect(`/sessions/${params.id}`);
};
