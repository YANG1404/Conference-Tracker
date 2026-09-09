CREATE TABLE `conference_series` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_key` text NOT NULL,
	`acronym` text NOT NULL,
	`name` text NOT NULL,
	`dblp_key` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_conference_series_catalog_key` ON `conference_series` (`catalog_key`);--> statement-breakpoint
CREATE INDEX `idx_conference_series_acronym` ON `conference_series` (`acronym`);--> statement-breakpoint
CREATE INDEX `idx_conference_series_dblp` ON `conference_series` (`dblp_key`);--> statement-breakpoint
ALTER TABLE `conference_catalog_entries` ADD `series_id` integer REFERENCES conference_series(id);--> statement-breakpoint
ALTER TABLE `conference_catalog_entries` ADD `track_name` text;--> statement-breakpoint
ALTER TABLE `conference_catalog_entries` ADD `presentation_type` text;--> statement-breakpoint
ALTER TABLE `conference_catalog_entries` ADD `source_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `conference_catalog_entries` ADD `raw_row` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_conference_catalog_series` ON `conference_catalog_entries` (`series_id`);--> statement-breakpoint
ALTER TABLE `conferences` ADD `series_id` integer REFERENCES conference_series(id);--> statement-breakpoint
CREATE INDEX `idx_conferences_series_year` ON `conferences` (`series_id`,`edition_year`);