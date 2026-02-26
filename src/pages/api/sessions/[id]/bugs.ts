import type { APIRoute } from 'astro';
import { requireSessionContext } from '@lib/services/helpers';
import { createBug } from '@lib/services/bugs';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const formData = await request.formData();
  const title = formData.get('title')?.toString()?.trim();

  if (!title) {
    return new Response(JSON.stringify({ error: 'missing_title' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const bugId = await createBug(params.id!, ctx.user.id, {
    title,
    description: formData.get('description')?.toString()?.trim() || null,
    stepsToReproduce: formData.get('stepsToReproduce')?.toString()?.trim() || null,
    severity: formData.get('severity')?.toString() || 'minor',
    type: formData.get('type')?.toString() || 'bug',
    testStepId: formData.get('testStepId')?.toString() || null,
    reportMode: formData.get('reportMode')?.toString() || 'freeform',
    testScenarioId: formData.get('testScenarioId')?.toString() || null,
    testSectionId: formData.get('testSectionId')?.toString() || null,
    tagIds: formData.getAll('tags').map((t) => t.toString()),
  });

  return new Response(JSON.stringify({ id: bugId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
