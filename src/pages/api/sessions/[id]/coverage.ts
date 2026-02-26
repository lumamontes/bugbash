import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { testScripts, testSections, testScenarios, scenarioExecutions, sessionParticipants, users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireSessionContext } from '@lib/services/helpers';

export const GET: APIRoute = async ({ params, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const participants = await db
    .select({ userId: users.id, userName: users.name })
    .from(sessionParticipants)
    .innerJoin(users, eq(sessionParticipants.userId, users.id))
    .where(eq(sessionParticipants.sessionId, params.id!));

  const scripts = await db.select().from(testScripts).where(eq(testScripts.sessionId, params.id!));

  const sections = [];
  for (const script of scripts) {
    const scriptSections = await db
      .select()
      .from(testSections)
      .where(eq(testSections.scriptId, script.id))
      .orderBy(testSections.sortOrder);

    for (const section of scriptSections) {
      const scenarios = await db
        .select()
        .from(testScenarios)
        .where(eq(testScenarios.sectionId, section.id))
        .orderBy(testScenarios.sortOrder);

      const scenarioIds = scenarios.map(s => s.id);
      const executions = scenarioIds.length > 0
        ? (await db
            .select()
            .from(scenarioExecutions)
            .where(eq(scenarioExecutions.sessionId, params.id!)))
            .filter(e => scenarioIds.includes(e.scenarioId))
        : [];

      const matrix: Record<string, Record<string, string>> = {};
      for (const scenario of scenarios) {
        matrix[scenario.id] = {};
        for (const exec of executions) {
          if (exec.scenarioId === scenario.id) {
            matrix[scenario.id][exec.userId] = exec.status;
          }
        }
      }

      const gaps: string[] = [];
      const conflicts: string[] = [];
      for (const scenario of scenarios) {
        const statuses = Object.values(matrix[scenario.id] || {}).filter(s => s !== 'not_started');
        if (statuses.length === 0) {
          gaps.push(scenario.id);
        }
        const uniqueStatuses = new Set(statuses);
        if (uniqueStatuses.size > 1 && (uniqueStatuses.has('pass') && (uniqueStatuses.has('fail') || uniqueStatuses.has('partial')))) {
          conflicts.push(scenario.id);
        }
      }

      const coveredCount = scenarios.filter(s => {
        const statuses = Object.values(matrix[s.id] || {}).filter(st => st !== 'not_started');
        return statuses.length > 0;
      }).length;

      sections.push({
        id: section.id,
        title: section.title,
        status: section.status,
        scenarios: scenarios.map(s => ({
          id: s.id,
          title: s.title,
          persona: s.persona,
        })),
        matrix,
        gaps,
        conflicts,
        coverage: scenarios.length > 0 ? Math.round((coveredCount / scenarios.length) * 100) : 0,
      });
    }
  }

  return new Response(JSON.stringify({ participants, sections }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
