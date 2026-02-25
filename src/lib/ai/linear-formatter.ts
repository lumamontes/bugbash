import Anthropic from '@anthropic-ai/sdk';

interface BugData {
  title: string;
  description: string | null;
  stepsToReproduce: string | null;
  severity: string;
  type: string;
  reporterName: string;
  sessionTitle: string;
}

interface FormattedResult {
  title: string;
  description: string;
}

const isAiEnabled = () => {
  const enabled = import.meta.env.AI_ENABLED ?? process.env.AI_ENABLED ?? 'true';
  return enabled === 'true';
};

const getApiKey = () => import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';

export async function formatBugForLinear(bug: BugData): Promise<FormattedResult> {
  if (!isAiEnabled() || !getApiKey()) {
    return fallbackFormat(bug);
  }

  try {
    const client = new Anthropic({ apiKey: getApiKey() });

    const prompt = `You are a QA engineer writing a Linear issue from a bug report found during a bug bash session.

Bug Report:
- Title: ${bug.title}
- Severity: ${bug.severity}
- Type: ${bug.type}
- Reporter: ${bug.reporterName}
- Session: ${bug.sessionTitle}
${bug.description ? `- Description: ${bug.description}` : ''}
${bug.stepsToReproduce ? `- Steps to Reproduce: ${bug.stepsToReproduce}` : ''}

Generate a polished Linear issue with:
1. A clear, concise title (max 80 chars, in Portuguese)
2. A well-structured description in markdown (in Portuguese) with sections:
   - **Descrição** — what the bug is
   - **Passos para Reproduzir** — numbered steps (improve/expand from original if sparse)
   - **Resultado Esperado** — what should happen
   - **Resultado Atual** — what actually happens
   - **Severidade** — ${bug.severity}
   - **Origem** — Bug Bash: ${bug.sessionTitle}

Respond in valid JSON: {"title": "...", "description": "..."}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as FormattedResult;
    }

    return fallbackFormat(bug);
  } catch (err) {
    console.error('AI formatting failed:', err);
    return fallbackFormat(bug);
  }
}

function fallbackFormat(bug: BugData): FormattedResult {
  const parts: string[] = [];

  if (bug.description) {
    parts.push(`## Descrição\n${bug.description}`);
  }

  if (bug.stepsToReproduce) {
    parts.push(`## Passos para Reproduzir\n${bug.stepsToReproduce}`);
  }

  parts.push(`## Informações\n- **Severidade:** ${bug.severity}\n- **Tipo:** ${bug.type}\n- **Reporter:** ${bug.reporterName}\n- **Sessão:** ${bug.sessionTitle}`);

  return {
    title: bug.title,
    description: parts.join('\n\n'),
  };
}
