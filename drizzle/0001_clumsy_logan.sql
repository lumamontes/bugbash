CREATE TABLE `badge_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`icon` text NOT NULL,
	`tier` text NOT NULL,
	`category` text NOT NULL,
	`threshold` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `badge_definitions_slug_unique` ON `badge_definitions` (`slug`);--> statement-breakpoint
CREATE TABLE `user_badges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`badge_id` text NOT NULL,
	`session_id` text,
	`earned_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`badge_id`) REFERENCES `badge_definitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`keycloak_sub` text,
	`onboarding_complete` integer DEFAULT true,
	`role` text DEFAULT 'participant' NOT NULL,
	`org_id` text NOT NULL,
	`squad_id` text,
	`avatar_url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "name", "email", "password_hash", "keycloak_sub", "onboarding_complete", "role", "org_id", "squad_id", "avatar_url", "created_at") SELECT "id", "name", "email", "password_hash", NULL, true, "role", "org_id", "squad_id", "avatar_url", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_keycloak_sub_unique` ON `users` (`keycloak_sub`);--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD `keycloak_access_token` text;--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD `keycloak_refresh_token` text;--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD `keycloak_token_expires_at` integer;