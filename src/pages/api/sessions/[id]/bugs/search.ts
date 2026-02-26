import type { APIRoute } from 'astro';
import { requireSessionContext } from '@lib/services/helpers';
import { searchBugs } from '@lib/services/bugs';

export const GET: APIRoute = async ({ params, url, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const query = url.searchParams.get('q')?.trim();
  if (!query || query.length < 3) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const matches = await searchBugs(params.id!, query);

  return new Response(JSON.stringify(matches), {
    headers: { 'Content-Type': 'application/json' },
  });
};
