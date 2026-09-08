CREATE TABLE `collection_candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection_run_id` integer NOT NULL,
	`matched_conference_id` integer,
	`source_url` text NOT NULL,
	`extracted_name` text,
	`extracted_acronym` text,
	`extracted_organization` text,
	`extracted_country_code` text,
	`extracted_city` text,
	`extracted_format` text,
	`raw_payload` text NOT NULL,
	`review_status` text DEFAULT 'PENDING' NOT NULL,
	`reviewed_by` integer,
	`reviewed_at` text,
	`rejection_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`collection_run_id`) REFERENCES `collection_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`matched_conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_candidate_review_status` ON `collection_candidates` (`review_status`);--> statement-breakpoint
CREATE INDEX `idx_candidate_matched_conference` ON `collection_candidates` (`matched_conference_id`);--> statement-breakpoint
CREATE TABLE `collection_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_site_id` integer NOT NULL,
	`status` text NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finished_at` text,
	`collected_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	FOREIGN KEY (`source_site_id`) REFERENCES `source_sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_collection_runs_source` ON `collection_runs` (`source_site_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `conference_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conference_id` integer NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_conference_links_type_url` ON `conference_links` (`conference_id`,`type`,`url`);--> statement-breakpoint
CREATE TABLE `conference_organizations` (
	`conference_id` integer NOT NULL,
	`organization_id` integer NOT NULL,
	`role_name` text DEFAULT 'HOST' NOT NULL,
	PRIMARY KEY(`conference_id`, `organization_id`, `role_name`),
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conference_research_fields` (
	`conference_id` integer NOT NULL,
	`research_field_id` integer NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`conference_id`, `research_field_id`),
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`research_field_id`) REFERENCES `research_fields`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_conference_field_filter` ON `conference_research_fields` (`research_field_id`);--> statement-breakpoint
CREATE TABLE `conference_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conference_id` integer NOT NULL,
	`source_site_id` integer,
	`source_url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`verified_at` text,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_site_id`) REFERENCES `source_sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_conference_sources_url` ON `conference_sources` (`conference_id`,`source_url`);--> statement-breakpoint
CREATE TABLE `conferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`acronym` text,
	`edition_year` integer,
	`description` text,
	`country_code` text NOT NULL,
	`city` text,
	`venue` text,
	`format` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`last_verified_at` text,
	`verified_by` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_conferences_name_year` ON `conferences` (`name`,`edition_year`);--> statement-breakpoint
CREATE INDEX `idx_conferences_status_country` ON `conferences` (`status`,`country_code`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conference_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text,
	`event_at` text NOT NULL,
	`end_at` text,
	`original_timezone` text NOT NULL,
	`time_confirmed` integer DEFAULT true NOT NULL,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_milestones_conference_type` ON `milestones` (`conference_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_milestones_calendar` ON `milestones` (`event_at`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`acronym` text,
	`country_code` text,
	`website_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_organizations_name` ON `organizations` (`name`);--> statement-breakpoint
CREATE TABLE `pins` (
	`user_id` integer NOT NULL,
	`conference_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `conference_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pins_user_created` ON `pins` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `research_fields` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`acm_ccs_code` text NOT NULL,
	`name_ko` text NOT NULL,
	`name_en` text NOT NULL,
	`depth` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `research_fields`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_research_fields_acm_ccs_code` ON `research_fields` (`acm_ccs_code`);--> statement-breakpoint
CREATE TABLE `source_sites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`source_type` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_collected_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_source_sites_base_url` ON `source_sites` (`base_url`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_user_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_users_external_user_id` ON `users` (`external_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_users_email` ON `users` (`email`);