CREATE TABLE `invite_links` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`created_by` text NOT NULL,
	`role` text DEFAULT 'participant' NOT NULL,
	`max_uses` integer DEFAULT 0 NOT NULL,
	`times_used` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_links_code_unique` ON `invite_links` (`code`);--> statement-breakpoint
ALTER TABLE `users` ADD `is_first_user` integer DEFAULT false;