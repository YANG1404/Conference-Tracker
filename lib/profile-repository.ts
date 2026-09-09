import { env } from 'cloudflare:workers';
import type { AppUser } from './google-auth';

function db(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable.');
  return env.DB;
}

export async function getProfile(user: AppUser) {
  const [fields, pins] = await Promise.all([
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
        SELECT c.id, c.name, c.acronym, c.edition_year,
          (SELECT MIN(m.event_at) FROM milestones m WHERE m.conference_id = c.id AND m.event_at >= CURRENT_TIMESTAMP) AS next_milestone_at,
          p.created_at AS pinned_at
        FROM pins p JOIN conferences c ON c.id = p.conference_id
        WHERE p.user_id = ? ORDER BY next_milestone_at IS NULL, next_milestone_at, c.name
      `)
      .bind(user.id)
      .all<Record<string, unknown>>(),
  ]);
  return {
    id: user.id,
    email: user.email,
    display_name: user.displayName,
    profile_image_url: user.profileImageUrl,
    role: user.role,
    created_at: user.createdAt,
    research_fields: fields.results,
    pinned_conferences: pins.results,
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
