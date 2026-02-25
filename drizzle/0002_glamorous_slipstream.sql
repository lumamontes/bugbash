CREATE TABLE `scenario_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario_id` text NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`comment` text,
	`executed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`scenario_id`) REFERENCES `test_scenarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `test_scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`title` text NOT NULL,
	`precondition` text,
	`steps_to_execute` text,
	`expected_result` text,
	`key_rules` text,
	`depends_on` text,
	`persona` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `test_sections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`depends_on`) REFERENCES `test_scenarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `test_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`script_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`not_ready_reason` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`script_id`) REFERENCES `test_scripts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `bugs` ADD `report_mode` text DEFAULT 'freeform';--> statement-breakpoint
ALTER TABLE `bugs` ADD `test_scenario_id` text REFERENCES test_scenarios(id);--> statement-breakpoint
ALTER TABLE `bugs` ADD `test_section_id` text REFERENCES test_sections(id);--> statement-breakpoint
ALTER TABLE `test_scripts` ADD `updated_at` integer;