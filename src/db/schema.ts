import { pgTable, text, integer, real, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Organizations ──────────────────────────────────────────────────────────
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Squads ─────────────────────────────────────────────────────────────────
export const squads = pgTable('squads', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  orgId: text('org_id').notNull().references(() => organizations.id),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  onboardingComplete: boolean('onboarding_complete').default(true),
  isFirstUser: boolean('is_first_user').default(false),
  role: text('role').notNull().default('participant'),
  orgId: text('org_id').notNull().references(() => organizations.id),
  squadId: text('squad_id').references(() => squads.id),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Invite Links ──────────────────────────────────────────────────────────
export const inviteLinks = pgTable('invite_links', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  createdBy: text('created_by').notNull().references(() => users.id),
  role: text('role').notNull().default('participant'),
  maxUses: integer('max_uses').notNull().default(0),
  timesUsed: integer('times_used').notNull().default(0),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Auth Sessions ──────────────────────────────────────────────────────────
export const authSessions = pgTable('auth_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Sessions (Bug Bash events) ─────────────────────────────────────────────
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'),
  orgId: text('org_id').notNull().references(() => organizations.id),
  createdBy: text('created_by').notNull().references(() => users.id),
  scheduledAt: timestamp('scheduled_at', { mode: 'date' }),
  startedAt: timestamp('started_at', { mode: 'date' }),
  endedAt: timestamp('ended_at', { mode: 'date' }),
  kickoffDuration: integer('kickoff_duration'),
  executionDuration: integer('execution_duration'),
  wrapupDuration: integer('wrapup_duration'),
  widgetEnabled: boolean('widget_enabled').notNull().default(false),
  widgetToken: text('widget_token'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Session Participants ───────────────────────────────────────────────────
export const sessionParticipants = pgTable('session_participants', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  userId: text('user_id').notNull().references(() => users.id),
  joinedAt: timestamp('joined_at', { mode: 'date' }).notNull(),
});

// ── Test Scripts (Roteiro) ─────────────────────────────────────────────────
export const testScripts = pgTable('test_scripts', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
});

// ── Test Sections (logical groupings within a roteiro) ─────────────────────
export const testSections = pgTable('test_sections', {
  id: text('id').primaryKey(),
  scriptId: text('script_id').notNull().references(() => testScripts.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  notReadyReason: text('not_ready_reason'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Test Scenarios (individual test cases within a section) ────────────────
export const testScenarios = pgTable('test_scenarios', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull().references(() => testSections.id),
  title: text('title').notNull(),
  precondition: text('precondition'),
  stepsToExecute: text('steps_to_execute'),
  expectedResult: text('expected_result'),
  keyRules: text('key_rules'),
  dependsOn: text('depends_on').references((): any => testScenarios.id),
  persona: text('persona'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Scenario Executions ────────────────────────────────────────────────────
export const scenarioExecutions = pgTable('scenario_executions', {
  id: text('id').primaryKey(),
  scenarioId: text('scenario_id').notNull().references(() => testScenarios.id),
  userId: text('user_id').notNull().references(() => users.id),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  status: text('status').notNull().default('not_started'),
  comment: text('comment'),
  executedAt: timestamp('executed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Test Steps (legacy, kept for backward compatibility) ───────────────────
export const testSteps = pgTable('test_steps', {
  id: text('id').primaryKey(),
  scriptId: text('script_id').notNull().references(() => testScripts.id),
  instruction: text('instruction').notNull(),
  expectedResult: text('expected_result'),
  orderIndex: integer('order_index').notNull().default(0),
});

// ── Test Step Results (legacy) ─────────────────────────────────────────────
export const testStepResults = pgTable('test_step_results', {
  id: text('id').primaryKey(),
  stepId: text('step_id').notNull().references(() => testSteps.id),
  userId: text('user_id').notNull().references(() => users.id),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  status: text('status').notNull(),
  notes: text('notes'),
  completedAt: timestamp('completed_at', { mode: 'date' }).notNull(),
});

// ── Test Credentials ───────────────────────────────────────────────────────
export const testCredentials = pgTable('test_credentials', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  profileType: text('profile_type').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  environment: text('environment'),
  claimedBy: text('claimed_by').references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Test Resources (Dados de Teste) ────────────────────────────────────────
export const testResources = pgTable('test_resources', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  label: text('label').notNull(),
  value: text('value').notNull(),
  group: text('group'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Bugs ───────────────────────────────────────────────────────────────────
export const bugs = pgTable('bugs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  reportedBy: text('reported_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  stepsToReproduce: text('steps_to_reproduce'),
  severity: text('severity').notNull(),
  type: text('type').notNull().default('bug'),
  status: text('status').notNull().default('open'),
  qualityScore: real('quality_score'),
  reportedVia: text('reported_via').notNull().default('platform'),
  reportMode: text('report_mode').default('freeform'),
  duplicateOf: text('duplicate_of').references(() => bugs.id),
  linearIssueId: text('linear_issue_id'),
  linearIssueUrl: text('linear_issue_url'),
  testStepId: text('test_step_id').references(() => testSteps.id),
  testScenarioId: text('test_scenario_id').references(() => testScenarios.id),
  testSectionId: text('test_section_id').references(() => testSections.id),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull(),
});

// ── Bug Evidence ───────────────────────────────────────────────────────────
export const bugEvidence = pgTable('bug_evidence', {
  id: text('id').primaryKey(),
  bugId: text('bug_id').notNull().references(() => bugs.id),
  type: text('type').notNull(),
  url: text('url').notNull(),
  filename: text('filename').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Bug Comments ───────────────────────────────────────────────────────────
export const bugComments = pgTable('bug_comments', {
  id: text('id').primaryKey(),
  bugId: text('bug_id').notNull().references(() => bugs.id),
  userId: text('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── Tags ───────────────────────────────────────────────────────────────────
export const tags = pgTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#6366f1'),
  orgId: text('org_id').notNull().references(() => organizations.id),
});

export const bugTags = pgTable('bug_tags', {
  id: text('id').primaryKey(),
  bugId: text('bug_id').notNull().references(() => bugs.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
});

// ── Badge Definitions ──────────────────────────────────────────────────────
export const badgeDefinitions = pgTable('badge_definitions', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  tier: text('tier').notNull(),
  category: text('category').notNull(),
  threshold: integer('threshold').notNull().default(1),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

// ── User Badges ────────────────────────────────────────────────────────────
export const userBadges = pgTable('user_badges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  badgeId: text('badge_id').notNull().references(() => badgeDefinitions.id),
  sessionId: text('session_id').references(() => sessions.id),
  earnedAt: timestamp('earned_at', { mode: 'date' }).notNull(),
});

// ── Relations ──────────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many }) => ({
  squads: many(squads),
  users: many(users),
  sessions: many(sessions),
  tags: many(tags),
}));

export const squadsRelations = relations(squads, ({ one, many }) => ({
  org: one(organizations, { fields: [squads.orgId], references: [organizations.id] }),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  org: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
  squad: one(squads, { fields: [users.squadId], references: [squads.id] }),
  authSessions: many(authSessions),
  reportedBugs: many(bugs),
  comments: many(bugComments),
  badges: many(userBadges),
  scenarioExecutions: many(scenarioExecutions),
  createdInvites: many(inviteLinks),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  org: one(organizations, { fields: [sessions.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [sessions.createdBy], references: [users.id] }),
  participants: many(sessionParticipants),
  testScripts: many(testScripts),
  testCredentials: many(testCredentials),
  testResources: many(testResources),
  bugs: many(bugs),
}));

export const sessionParticipantsRelations = relations(sessionParticipants, ({ one }) => ({
  session: one(sessions, { fields: [sessionParticipants.sessionId], references: [sessions.id] }),
  user: one(users, { fields: [sessionParticipants.userId], references: [users.id] }),
}));

export const testScriptsRelations = relations(testScripts, ({ one, many }) => ({
  session: one(sessions, { fields: [testScripts.sessionId], references: [sessions.id] }),
  sections: many(testSections),
  steps: many(testSteps),
}));

export const testSectionsRelations = relations(testSections, ({ one, many }) => ({
  script: one(testScripts, { fields: [testSections.scriptId], references: [testScripts.id] }),
  scenarios: many(testScenarios),
}));

export const testScenariosRelations = relations(testScenarios, ({ one, many }) => ({
  section: one(testSections, { fields: [testScenarios.sectionId], references: [testSections.id] }),
  dependsOnScenario: one(testScenarios, { fields: [testScenarios.dependsOn], references: [testScenarios.id] }),
  executions: many(scenarioExecutions),
}));

export const scenarioExecutionsRelations = relations(scenarioExecutions, ({ one }) => ({
  scenario: one(testScenarios, { fields: [scenarioExecutions.scenarioId], references: [testScenarios.id] }),
  user: one(users, { fields: [scenarioExecutions.userId], references: [users.id] }),
  session: one(sessions, { fields: [scenarioExecutions.sessionId], references: [sessions.id] }),
}));

export const testStepsRelations = relations(testSteps, ({ one, many }) => ({
  script: one(testScripts, { fields: [testSteps.scriptId], references: [testScripts.id] }),
  results: many(testStepResults),
}));

export const testStepResultsRelations = relations(testStepResults, ({ one }) => ({
  step: one(testSteps, { fields: [testStepResults.stepId], references: [testSteps.id] }),
  user: one(users, { fields: [testStepResults.userId], references: [users.id] }),
  session: one(sessions, { fields: [testStepResults.sessionId], references: [sessions.id] }),
}));

export const testCredentialsRelations = relations(testCredentials, ({ one }) => ({
  session: one(sessions, { fields: [testCredentials.sessionId], references: [sessions.id] }),
  claimedByUser: one(users, { fields: [testCredentials.claimedBy], references: [users.id] }),
}));

export const testResourcesRelations = relations(testResources, ({ one }) => ({
  session: one(sessions, { fields: [testResources.sessionId], references: [sessions.id] }),
}));

export const bugsRelations = relations(bugs, ({ one, many }) => ({
  session: one(sessions, { fields: [bugs.sessionId], references: [sessions.id] }),
  reporter: one(users, { fields: [bugs.reportedBy], references: [users.id] }),
  duplicateOfBug: one(bugs, { fields: [bugs.duplicateOf], references: [bugs.id] }),
  testStep: one(testSteps, { fields: [bugs.testStepId], references: [testSteps.id] }),
  testScenario: one(testScenarios, { fields: [bugs.testScenarioId], references: [testScenarios.id] }),
  testSection: one(testSections, { fields: [bugs.testSectionId], references: [testSections.id] }),
  evidence: many(bugEvidence),
  comments: many(bugComments),
  tags: many(bugTags),
}));

export const bugEvidenceRelations = relations(bugEvidence, ({ one }) => ({
  bug: one(bugs, { fields: [bugEvidence.bugId], references: [bugs.id] }),
}));

export const bugCommentsRelations = relations(bugComments, ({ one }) => ({
  bug: one(bugs, { fields: [bugComments.bugId], references: [bugs.id] }),
  user: one(users, { fields: [bugComments.userId], references: [users.id] }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  org: one(organizations, { fields: [tags.orgId], references: [organizations.id] }),
  bugTags: many(bugTags),
}));

export const bugTagsRelations = relations(bugTags, ({ one }) => ({
  bug: one(bugs, { fields: [bugTags.bugId], references: [bugs.id] }),
  tag: one(tags, { fields: [bugTags.tagId], references: [tags.id] }),
}));

export const badgeDefinitionsRelations = relations(badgeDefinitions, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, { fields: [userBadges.userId], references: [users.id] }),
  badge: one(badgeDefinitions, { fields: [userBadges.badgeId], references: [badgeDefinitions.id] }),
  session: one(sessions, { fields: [userBadges.sessionId], references: [sessions.id] }),
}));

export const inviteLinksRelations = relations(inviteLinks, ({ one }) => ({
  creator: one(users, { fields: [inviteLinks.createdBy], references: [users.id] }),
}));
