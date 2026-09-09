CREATE TABLE `schedule_feeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_key` text NOT NULL,
	`conference_id` integer,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`payload` text,
	`content_hash` text,
	`last_checked_at` text,
	`last_success_at` text,
	`next_check_at` text,
	`lease_until` text,
	`status` text DEFAULT 'IDLE' NOT NULL,
	`error_message` text,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_schedule_feed_key` ON `schedule_feeds` (`source_key`);--> statement-breakpoint
CREATE INDEX `idx_schedule_feeds_due` ON `schedule_feeds` (`enabled`,`next_check_at`);--> statement-breakpoint
ALTER TABLE `milestones` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `milestones` ADD `source_text` text;--> statement-breakpoint
ALTER TABLE `milestones` ADD `source_kind` text;--> statement-breakpoint
ALTER TABLE `milestones` ADD `external_key` text;