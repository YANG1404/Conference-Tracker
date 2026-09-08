import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    externalUserId: text('external_user_id').notNull(),
    email: text('email').notNull(),
    role: text('role', { enum: ['MEMBER', 'ADMIN'] }).notNull().default('MEMBER'),
    status: text('status', { enum: ['ACTIVE', 'INACTIVE', 'LOCKED'] }).notNull().default('ACTIVE'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex('uq_users_external_user_id').on(table.externalUserId),
    uniqueIndex('uq_users_email').on(table.email),
  ],
);

export const conferences = sqliteTable(
  'conferences',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    acronym: text('acronym'),
    editionYear: integer('edition_year'),
    description: text('description'),
    countryCode: text('country_code').notNull(),
    city: text('city'),
    venue: text('venue'),
    format: text('format', { enum: ['ONSITE', 'ONLINE', 'HYBRID'] }).notNull(),
    status: text('status', { enum: ['DRAFT', 'PUBLISHED', 'HIDDEN'] }).notNull().default('DRAFT'),
    lastVerifiedAt: text('last_verified_at'),
    verifiedBy: integer('verified_by').references(() => users.id),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_conferences_name_year').on(table.name, table.editionYear),
    index('idx_conferences_status_country').on(table.status, table.countryCode),
  ],
);

export const organizations = sqliteTable(
  'organizations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    acronym: text('acronym'),
    countryCode: text('country_code'),
    websiteUrl: text('website_url'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex('uq_organizations_name').on(table.name)],
);

export const conferenceOrganizations = sqliteTable(
  'conference_organizations',
  {
    conferenceId: integer('conference_id').notNull().references(() => conferences.id, { onDelete: 'cascade' }),
    organizationId: integer('organization_id').notNull().references(() => organizations.id),
    roleName: text('role_name').notNull().default('HOST'),
  },
  (table) => [primaryKey({ columns: [table.conferenceId, table.organizationId, table.roleName] })],
);

export const researchFields = sqliteTable(
  'research_fields',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    parentId: integer('parent_id').references((): AnySQLiteColumn => researchFields.id),
    acmCcsCode: text('acm_ccs_code').notNull(),
    nameKo: text('name_ko').notNull(),
    nameEn: text('name_en').notNull(),
    depth: integer('depth').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => [uniqueIndex('uq_research_fields_acm_ccs_code').on(table.acmCcsCode)],
);

export const conferenceResearchFields = sqliteTable(
  'conference_research_fields',
  {
    conferenceId: integer('conference_id').notNull().references(() => conferences.id, { onDelete: 'cascade' }),
    researchFieldId: integer('research_field_id').notNull().references(() => researchFields.id),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.conferenceId, table.researchFieldId] }),
    index('idx_conference_field_filter').on(table.researchFieldId),
  ],
);

export const milestones = sqliteTable(
  'milestones',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    conferenceId: integer('conference_id').notNull().references(() => conferences.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title'),
    eventAt: text('event_at').notNull(),
    endAt: text('end_at'),
    originalTimezone: text('original_timezone').notNull(),
    timeConfirmed: integer('time_confirmed', { mode: 'boolean' }).notNull().default(true),
    note: text('note'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_milestones_conference_type').on(table.conferenceId, table.type),
    index('idx_milestones_calendar').on(table.eventAt),
  ],
);

export const conferenceLinks = sqliteTable(
  'conference_links',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    conferenceId: integer('conference_id').notNull().references(() => conferences.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    label: text('label').notNull(),
    url: text('url').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex('uq_conference_links_type_url').on(table.conferenceId, table.type, table.url)],
);

export const pins = sqliteTable(
  'pins',
  {
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    conferenceId: integer('conference_id').notNull().references(() => conferences.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.conferenceId] }),
    index('idx_pins_user_created').on(table.userId, table.createdAt),
  ],
);

export const sourceSites = sqliteTable(
  'source_sites',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    baseUrl: text('base_url').notNull(),
    sourceType: text('source_type', { enum: ['API', 'RSS', 'WEB_PAGE'] }).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    lastCollectedAt: text('last_collected_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex('uq_source_sites_base_url').on(table.baseUrl)],
);

export const collectionRuns = sqliteTable(
  'collection_runs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceSiteId: integer('source_site_id').notNull().references(() => sourceSites.id),
    status: text('status').notNull(),
    startedAt: text('started_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    finishedAt: text('finished_at'),
    collectedCount: integer('collected_count').notNull().default(0),
    errorMessage: text('error_message'),
  },
  (table) => [index('idx_collection_runs_source').on(table.sourceSiteId, table.startedAt)],
);

export const collectionCandidates = sqliteTable(
  'collection_candidates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    collectionRunId: integer('collection_run_id').notNull().references(() => collectionRuns.id, { onDelete: 'cascade' }),
    matchedConferenceId: integer('matched_conference_id').references(() => conferences.id),
    sourceUrl: text('source_url').notNull(),
    extractedName: text('extracted_name'),
    extractedAcronym: text('extracted_acronym'),
    extractedOrganization: text('extracted_organization'),
    extractedCountryCode: text('extracted_country_code'),
    extractedCity: text('extracted_city'),
    extractedFormat: text('extracted_format'),
    rawPayload: text('raw_payload', { mode: 'json' }).notNull(),
    reviewStatus: text('review_status').notNull().default('PENDING'),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    reviewedAt: text('reviewed_at'),
    rejectionReason: text('rejection_reason'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_candidate_review_status').on(table.reviewStatus),
    index('idx_candidate_matched_conference').on(table.matchedConferenceId),
  ],
);

export const conferenceSources = sqliteTable(
  'conference_sources',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    conferenceId: integer('conference_id').notNull().references(() => conferences.id, { onDelete: 'cascade' }),
    sourceSiteId: integer('source_site_id').references(() => sourceSites.id),
    sourceUrl: text('source_url').notNull(),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    verifiedAt: text('verified_at'),
  },
  (table) => [uniqueIndex('uq_conference_sources_url').on(table.conferenceId, table.sourceUrl)],
);
