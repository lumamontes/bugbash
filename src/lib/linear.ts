import { LinearClient } from '@linear/sdk';

const getApiKey = () => import.meta.env.LINEAR_API_KEY || process.env.LINEAR_API_KEY || '';
const getTeamId = () => import.meta.env.LINEAR_TEAM_ID || process.env.LINEAR_TEAM_ID || '';

function getClient(): LinearClient {
  return new LinearClient({ apiKey: getApiKey() });
}

export function isLinearConfigured(): boolean {
  return !!(getApiKey() && getTeamId());
}

const severityToPriority: Record<string, number> = {
  blocker: 1,  // Urgent
  major: 2,    // High
  minor: 3,    // Medium
  enhancement: 4, // Low
};

interface CreateIssueParams {
  title: string;
  description: string;
  severity: string;
  labels?: string[];
}

interface CreateIssueResult {
  issueId: string;
  issueUrl: string;
}

export async function createLinearIssue(params: CreateIssueParams): Promise<CreateIssueResult> {
  const client = getClient();
  const teamId = getTeamId();
  const priority = severityToPriority[params.severity] ?? 3;

  const issue = await client.createIssue({
    teamId,
    title: params.title,
    description: params.description,
    priority,
  });

  const createdIssue = await issue.issue;
  if (!createdIssue) {
    throw new Error('Failed to create Linear issue');
  }

  return {
    issueId: createdIssue.identifier,
    issueUrl: createdIssue.url,
  };
}
