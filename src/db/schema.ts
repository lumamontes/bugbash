import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ── Organizations ──────────────────────────────────────────────────────────
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Squads ─────────────────────────────────────────────────────────────────
export const squads = sqliteTable('squads', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  orgId: text('org_id').notNull().references(() => organizations.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Users ──────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  keycloakSub: text('keycloak_sub').unique(),
  onboardingComplete: integer('onboarding_complete', { mode: 'boolean' }).default(true),
  isFirstUser: integer('is_first_user', { mode: 'boolean' }).default(false),
  role: text('role', { enum: ['facilitator', 'participant', 'admin'] }).notNull().default('participant'),
  orgId: text('org_id').notNull().references(() => organizations.id),
  squadId: text('squad_id').references(() => squads.id),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Invite Links ──────────────────────────────────────────────────────────
export const inviteLinks = sqliteTable('invite_links', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  createdBy: text('created_by').notNull().references(() => users.id),
  role: text('role', { enum: ['participant', 'facilitator', 'admin'] }).notNull().default('participant'),
  maxUses: integer('max_uses').notNull().default(0),
  timesUsed: integer('times_used').notNull().default(0),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Auth Sessions ──────────────────────────────────────────────────────────
export const authSessions = sqliteTable('auth_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  keycloakAccessToken: text('keycloak_access_token'),
  keycloakRefreshToken: text('keycloak_refresh_token'),
  keycloakTokenExpiresAt: integer('keycloak_token_expires_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Sessions (Bug Bash events) ─────────────────────────────────────────────
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['draft', 'scheduled', 'kickoff', 'execution', 'wrapup', 'closed'],
  }).notNull().default('draft'),
  orgId: text('org_id').notNull().references(() => organizations.id),
  createdBy: text('created_by').notNull().references(() => users.id),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  kickoffDuration: integer('kickoff_duration'),
  executionDuration: integer('execution_duration'),
  wrapupDuration: integer('wrapup_duration'),
  widgetEnabled: integer('widget_enabled', { mode: 'boolean' }).notNull().default(false),
  widgetToken: text('widget_token'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Session Participants ───────────────────────────────────────────────────
export const sessionParticipants = sqliteTable('session_participants', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  userId: text('user_id').notNull().references(() => users.id),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
});

// ── Test Scripts (Roteiro) ─────────────────────────────────────────────────
export const testScripts = sqliteTable('test_scripts', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// ── Test Sections (logical groupings within a roteiro) ─────────────────────
export const testSections = sqliteTable('test_sections', {
  id: text('id').primaryKey(),
  scriptId: text('script_id').notNull().references(() => testScripts.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active', 'draft', 'not_ready'] }).notNull().default('active'),
  notReadyReason: text('not_ready_reason'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Test Scenarios (individual test cases within a section) ────────────────
export const testScenarios = sqliteTable('test_scenarios', {
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Scenario Executions ────────────────────────────────────────────────────
export const scenarioExecutions = sqliteTable('scenario_executions', {
  id: text('id').primaryKey(),
  scenarioId: text('scenario_id').notNull().references(() => testScenarios.id),
  userId: text('user_id').notNull().references(() => users.id),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  status: text('status', { enum: ['not_started', 'pass', 'partial', 'fail', 'blocked', 'skipped'] }).notNull().default('not_started'),
  comment: text('comment'),
  executedAt: integer('executed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Test Steps (legacy, kept for backward compatibility) ───────────────────
export const testSteps = sqliteTable('test_steps', {
  id: text('id').primaryKey(),
  scriptId: text('script_id').notNull().references(() => testScripts.id),
  instruction: text('instruction').notNull(),
  expectedResult: text('expected_result'),
  orderIndex: integer('order_index').notNull().default(0),
});

// ── Test Step Results (legacy) ─────────────────────────────────────────────
export const testStepResults = sqliteTable('test_step_results', {
  id: text('id').primaryKey(),
  stepId: text('step_id').notNull().references(() => testSteps.id),
  userId: text('user_id').notNull().references(() => users.id),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  status: text('status', { enum: ['passed', 'failed', 'blocked', 'skipped'] }).notNull(),
  notes: text('notes'),
  completedAt: integer('completed_at', { mode: 'timestamp' }).notNull(),
});

// ── Test Credentials ───────────────────────────────────────────────────────
export const testCredentials = sqliteTable('test_credentials', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  profileType: text('profile_type').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  environment: text('environment'),
  claimedBy: text('claimed_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Bugs ───────────────────────────────────────────────────────────────────
export const bugs = sqliteTable('bugs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  reportedBy: text('reported_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  stepsToReproduce: text('steps_to_reproduce'),
  severity: text('severity', { enum: ['blocker', 'major', 'minor', 'enhancement'] }).notNull(),
  type: text('type', { enum: ['bug', 'improvement', 'ux_insight'] }).notNull().default('bug'),
  status: text('status', { enum: ['open', 'confirmed', 'fixed', 'wontfix', 'duplicate'] }).notNull().default('open'),
  qualityScore: real('quality_score'),
  reportedVia: text('reported_via', { enum: ['platform', 'widget'] }).notNull().default('platform'),
  reportMode: text('report_mode', { enum: ['guided', 'freeform'] }).default('freeform'),
  duplicateOf: text('duplicate_of').references(() => bugs.id),
  linearIssueId: text('linear_issue_id'),
  linearIssueUrl: text('linear_issue_url'),
  testStepId: text('test_step_id').references(() => testSteps.id),
  testScenarioId: text('test_scenario_id').references(() => testScenarios.id),
  testSectionId: text('test_section_id').references(() => testSections.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ── Bug Evidence ───────────────────────────────────────────────────────────
export const bugEvidence = sqliteTable('bug_evidence', {
  id: text('id').primaryKey(),
  bugId: text('bug_id').notNull().references(() => bugs.id),
  type: text('type', { enum: ['screenshot', 'video', 'file'] }).notNull(),
  url: text('url').notNull(),
  filename: text('filename').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Bug Comments ───────────────────────────────────────────────────────────
export const bugComments = sqliteTable('bug_comments', {
  id: text('id').primaryKey(),
  bugId: text('bug_id').notNull().references(() => bugs.id),
  userId: text('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Tags ───────────────────────────────────────────────────────────────────
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#6366f1'),
  orgId: text('org_id').notNull().references(() => organizations.id),
});

export const bugTags = sqliteTable('bug_tags', {
  id: text('id').primaryKey(),
  bugId: text('bug_id').notNull().references(() => bugs.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
});

// ── Badge Definitions ──────────────────────────────────────────────────────
export const badgeDefinitions = sqliteTable('badge_definitions', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  tier: text('tier', { enum: ['bronze', 'silver', 'gold', 'platinum'] }).notNull(),
  category: text('category', { enum: ['bugs', 'quality', 'collaboration', 'streaks', 'special'] }).notNull(),
  threshold: integer('threshold').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── User Badges ────────────────────────────────────────────────────────────
export const userBadges = sqliteTable('user_badges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  badgeId: text('badge_id').notNull().references(() => badgeDefinitions.id),
  sessionId: text('session_id').references(() => sessions.id),
  earnedAt: integer('earned_at', { mode: 'timestamp' }).notNull(),
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
