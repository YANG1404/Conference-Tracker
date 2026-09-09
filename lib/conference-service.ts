import { dayDifference } from './schedule-time';
import {
  listConferences,
  listLinks,
  listPins,
  type AuthenticatedUser,
} from './conference-repository';

type ConferenceView = {
  id: number;
  name: string;
  acronym: string | null;
  edition_year: number | null;
  description: string | null;
  country_code: string;
  city: string | null;
  venue: string | null;
  format: string;
  status: string;
  last_verified_at: string | null;
  research_fields: Array<{
    id: number;
    name_ko: string;
    name_en: string;
    is_primary: boolean;
  }>;
  milestones: Array<{
    id: number;
    type: string;
    group_name: string | null;
    title: string | null;
    event_at: string;
    end_at: string | null;
    source_url: string | null;
    source_kind: string | null;
    original_timezone: string;
    time_confirmed: boolean;
    d_day: number;
  }>;
  links: Array<Record<string, unknown>>;
  is_domestic: boolean;
  is_pinned: boolean;
  d_day: number | null;
  next_milestone: ConferenceView['milestones'][number] | null;
};

function stringValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return `${value}`;
  return '';
}

export async function getConferenceViews(user: AuthenticatedUser | null) {
  const [rows, links, pinRows] = await Promise.all([
    listConferences(),
    listLinks(),
    user ? listPins(user) : Promise.resolve([]),
  ]);
  const pinnedIds = new Set(pinRows.map((pin) => pin.conference_id));
  const byId = new Map<number, ConferenceView>();

  for (const row of rows) {
    const id = Number(row.id);
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        name: stringValue(row.name),
        acronym: row.acronym ? stringValue(row.acronym) : null,
        edition_year: row.edition_year ? Number(row.edition_year) : null,
        description: row.description ? stringValue(row.description) : null,
        country_code: stringValue(row.country_code),
        city: row.city ? stringValue(row.city) : null,
        venue: row.venue ? stringValue(row.venue) : null,
        format: stringValue(row.format),
        status: stringValue(row.status),
        last_verified_at: row.last_verified_at
          ? stringValue(row.last_verified_at)
          : null,
        research_fields: [],
        milestones: [],
        links: [],
        is_domestic: stringValue(row.country_code) === 'KR',
        is_pinned: pinnedIds.has(id),
        d_day: null,
        next_milestone: null,
      });
    }
    const item = byId.get(id)!;
    const fieldId = row.field_id ? Number(row.field_id) : null;
    if (
      fieldId &&
      !item.research_fields.some((field) => field.id === fieldId)
    ) {
      item.research_fields.push({
        id: fieldId,
        name_ko: stringValue(row.field_name_ko),
        name_en: stringValue(row.field_name_en),
        is_primary: Boolean(row.is_primary),
      });
    }
    const milestoneId = row.milestone_id ? Number(row.milestone_id) : null;
    if (
      milestoneId &&
      !item.milestones.some((milestone) => milestone.id === milestoneId)
    ) {
      item.milestones.push({
        id: milestoneId,
        type: stringValue(row.milestone_type),
        group_name: row.milestone_group_name
          ? stringValue(row.milestone_group_name)
          : null,
        title: row.milestone_title ? stringValue(row.milestone_title) : null,
        event_at: stringValue(row.event_at),
        end_at: row.end_at ? stringValue(row.end_at) : null,
        source_url: row.source_url ? stringValue(row.source_url) : null,
        source_kind: row.source_kind ? stringValue(row.source_kind) : null,
        original_timezone: stringValue(row.original_timezone),
        time_confirmed: Boolean(row.time_confirmed),
        d_day: dayDifference(
          stringValue(row.event_at),
          Boolean(row.time_confirmed),
        ),
      });
    }
  }

  for (const link of links) {
    byId.get(Number(link.conference_id))?.links.push(link);
  }

  for (const item of byId.values()) {
    item.milestones.sort((a, b) => a.event_at.localeCompare(b.event_at));
    item.next_milestone =
      item.milestones.find((milestone) => milestone.d_day >= 0) ??
      item.milestones.at(-1) ??
      null;
    if (item.next_milestone) {
      item.d_day = item.next_milestone.d_day;
    }
  }
  return [...byId.values()];
}
