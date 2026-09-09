CREATE TABLE `catalog_sync_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`source_url` text NOT NULL,
	`status` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`last_synced_at` text,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `conference_catalog_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_row` integer NOT NULL,
	`acronym` text NOT NULL,
	`canonical_acronym` text NOT NULL,
	`name` text NOT NULL,
	`dblp_key` text NOT NULL,
	`ksi_grade` text,
	`bk21_if` text,
	`kaist_recognized` integer DEFAULT false NOT NULL,
	`snu_recognized` integer DEFAULT false NOT NULL,
	`postech_grade` text,
	`normalized_score` text,
	`is_active` integer DEFAULT true NOT NULL,
	`synced_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_conference_catalog_source_row` ON `conference_catalog_entries` (`source_row`);--> statement-breakpoint
CREATE INDEX `idx_conference_catalog_canonical` ON `conference_catalog_entries` (`canonical_acronym`);--> statement-breakpoint
CREATE INDEX `idx_conference_catalog_dblp` ON `conference_catalog_entries` (`dblp_key`);--> statement-breakpoint
CREATE TABLE `user_research_fields` (
	`user_id` integer NOT NULL,
	`research_field_id` integer NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`user_id`, `research_field_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`research_field_id`) REFERENCES `research_fields`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_research_fields_field` ON `user_research_fields` (`research_field_id`);--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_sessions_user` ON `user_sessions` (`user_id`,`expires_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `profile_image_url` text;--> statement-breakpoint
ALTER TABLE `users` ADD `auth_provider` text;