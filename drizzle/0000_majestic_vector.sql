CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bug_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`bug_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bug_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`bug_id` text NOT NULL,
	`type` text NOT NULL,
	`url` text NOT NULL,
	`filename` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bug_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`bug_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bugs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`reported_by` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`steps_to_reproduce` text,
	`severity` text NOT NULL,
	`type` text DEFAULT 'bug' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`quality_score` real,
	`reported_via` text DEFAULT 'platform' NOT NULL,
	`duplicate_of` text,
	`linear_issue_id` text,
	`linear_issue_url` text,
	`test_step_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`duplicate_of`) REFERENCES `bugs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_step_id`) REFERENCES `test_steps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `session_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`org_id` text NOT NULL,
	`created_by` text NOT NULL,
	`scheduled_at` integer,
	`started_at` integer,
	`ended_at` integer,
	`kickoff_duration` integer,
	`execution_duration` integer,
	`wrapup_duration` integer,
	`widget_enabled` integer DEFAULT false NOT NULL,
	`widget_token` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `squads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`org_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`org_id` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `test_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`profile_type` text NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`environment` text,
	`claimed_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`claimed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `test_scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `test_step_results` (
	`id` text PRIMARY KEY NOT NULL,
	`step_id` text NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `test_steps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `test_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`script_id` text NOT NULL,
	`instruction` text NOT NULL,
	`expected_result` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`script_id`) REFERENCES `test_scripts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'participant' NOT NULL,
	`org_id` text NOT NULL,
	`squad_id` text,
	`avatar_url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);