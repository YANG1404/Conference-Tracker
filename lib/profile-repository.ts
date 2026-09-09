import { env } from 'cloudflare:workers';
import type { AppUser } from './google-auth';

function db(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable.');
  return env.DB;
}

export async function getProfile(user: AppUser) {
  const [fields, pins, pinFields] = await Promise.all([
    db()
      .prepare(`
        SELECT rf.id, rf.acm_ccs_code, rf.name_ko, rf.name_en, urf.is_primary
        FROM user_research_fields urf
        JOIN research_fields rf ON rf.id = urf.research_field_id
        WHERE urf.user_id = ? ORDER BY urf.is_primary DESC, rf.name_ko
      `)
      .bind(user.id)
      .all<Record<string, unknown>>(),
    db()
      .prepare(`
        SELECT c.id, c.name, c.acronym, c.edition_year, c.country_code, c.format,
          m.id AS next_milestone_id, m.group_name AS next_group_name,
          m.title AS next_milestone_title, m.event_at AS next_milestone_at,
          m.original_timezone AS next_milestone_timezone,
          p.created_at AS pinned_at
        FROM pins p
        JOIN conferences c ON c.id = p.conference_id
        LEFT JOIN milestones m ON m.id = (
          SELECT future.id FROM milestones future
          WHERE future.conference_id = c.id AND future.event_at >= CURRENT_TIMESTAMP
          ORDER BY future.event_at LIMIT 1
        )
        WHERE p.user_id = ? ORDER BY next_milestone_at IS NULL, next_milestone_at, c.name
      `)
      .bind(user.id)
      .all<Record<string, unknown>>(),
    db()
      .prepare(`
        SELECT p.conference_id, rf.id, rf.acm_ccs_code, rf.name_ko, rf.name_en, crf.is_primary
        FROM pins p
        JOIN conference_research_fields crf ON crf.conference_id = p.conference_id
        JOIN research_fields rf ON rf.id = crf.research_field_id
        WHERE p.user_id = ?
        ORDER BY p.conference_id, crf.is_primary DESC, rf.name_ko
      `)
      .bind(user.id)
      .all<Record<string, unknown>>(),
  ]);
  const pinnedConferences = pins.results.map((pin) => ({
    ...pin,
    research_fields: pinFields.results.filter(
      (field) => Number(field.conference_id) === Number(pin.id),
    ),
  }));
  return {
    id: user.id,
    email: user.email,
    display_name: user.displayName,
    profile_image_url: user.profileImageUrl,
    role: user.role,
    created_at: user.createdAt,
    research_fields: fields.results,
    pinned_conference_count: pinnedConferences.length,
    pinned_conferences: pinnedConferences,
  };
}

export async function updateProfile(
  user: AppUser,
  input: {
    display_name: string;
    research_field_ids: number[];
    primary_research_field_id?: number | null;
  },
) {
  const statements: D1PreparedStatement[] = [
    db()
      .prepare(
        'UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      )
      .bind(input.display_name.trim(), user.id),
    db()
      .prepare('DELETE FROM user_research_fields WHERE user_id = ?')
      .bind(user.id),
  ];
  for (const fieldId of new Set(input.research_field_ids)) {
    statements.push(
      db()
        .prepare(
          'INSERT INTO user_research_fields (user_id, research_field_id, is_primary) VALUES (?, ?, ?)',
        )
        .bind(
          user.id,
          fieldId,
          fieldId === input.primary_research_field_id ? 1 : 0,
        ),
    );
  }
  await db().batch(statements);
  return getProfile({ ...user, displayName: input.display_name.trim() });
}

export async function validResearchFieldIds(ids: number[]) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];
  const placeholders = uniqueIds.map(() => '?').join(', ');
  const result = await db()
    .prepare(
      `SELECT id FROM research_fields WHERE is_active = 1 AND id IN (${placeholders})`,
    )
    .bind(...uniqueIds)
    .all<{ id: number }>();
  return result.results.map((field) => Number(field.id));
}
