import { normalizeScheduleDate } from './schedule-time';
import { env } from 'cloudflare:workers';

export type AuthenticatedUser = {
  externalUserId: string;
  email: string;
};

export type ConferenceInput = {
  name: string;
  acronym?: string | null;
  edition_year?: number | null;
  description?: string | null;
  country_code: string;
  city?: string | null;
  venue?: string | null;
  format: 'ONSITE' | 'ONLINE' | 'HYBRID' | 'UNKNOWN';
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  research_field_ids?: number[];
  primary_research_field_id?: number | null;
  milestones?: Array<{
    id?: number;
    end_at?: string | null;
    source_url?: string | null;
    source_text?: string | null;
    source_kind?: string | null;
    external_key?: string | null;
    group_name?: string | null;
    title: string;
    event_at: string;
    original_timezone: string;
    time_confirmed?: boolean;
    note?: string | null;
  }>;
  links?: Array<{
    type: string;
    label: string;
    url: string;
    is_active?: boolean;
  }>;
};

export type SourceSiteInput = {
  name: string;
  base_url: string;
  source_type: 'API' | 'RSS' | 'WEB_PAGE';
  is_active?: boolean;
};

function db(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable.');
  return env.DB;
}

export function readAuthenticatedUser(
  headers: Headers,
): AuthenticatedUser | null {
  const externalUserId = headers.get('oai-authenticated-user-id');
  const email = headers.get('oai-authenticated-user-email');
  if (!externalUserId || !email) return null;
  return { externalUserId, email };
}

const acmCcsTopLevelFields = [
  ['10002944', '일반 및 참조', 'General and reference'],
  ['10010520', '하드웨어', 'Hardware'],
  ['10010583', '컴퓨터 시스템 구성', 'Computer systems organization'],
  ['10003033', '네트워크', 'Networks'],
  ['10011007', '소프트웨어 및 소프트웨어 공학', 'Software and its engineering'],
  ['10003752', '계산 이론', 'Theory of computation'],
  ['10002950', '컴퓨팅 수학', 'Mathematics of computing'],
  ['10002951', '정보 시스템', 'Information systems'],
  ['10002978', '보안 및 개인정보 보호', 'Security and privacy'],
  ['10003120', '인간 중심 컴퓨팅', 'Human-centered computing'],
  ['10010147', '컴퓨팅 방법론', 'Computing methodologies'],
  ['10010405', '응용 컴퓨팅', 'Applied computing'],
  ['10003456', '사회 및 전문 주제', 'Social and professional topics'],
] as const;

async function syncAcmCcsFields() {
  const row = await db()
    .prepare(
      'SELECT COUNT(*) AS count FROM research_fields WHERE depth = 0 AND is_active = 1',
    )
    .first<{ count: number }>();
  if ((row?.count ?? 0) >= acmCcsTopLevelFields.length) return;
  const statements = acmCcsTopLevelFields.map((field) =>
    db()
      .prepare(`
        INSERT INTO research_fields (acm_ccs_code, name_ko, name_en, depth, is_active)
        VALUES (?, ?, ?, 0, 1)
        ON CONFLICT(acm_ccs_code) DO UPDATE SET
          name_ko = excluded.name_ko,
          name_en = excluded.name_en,
          depth = 0,
          is_active = 1
      `)
      .bind(...field),
  );
  await db().batch(statements);
}

export async function ensureDemoData() {
  await syncAcmCcsFields();
}

export async function ensureUser(user: AuthenticatedUser) {
  const existing = await db()
    .prepare(
      'SELECT id, email, role, status FROM users WHERE external_user_id = ?',
    )
    .bind(user.externalUserId)
    .first<{ id: number; email: string; role: string; status: string }>();
  if (existing) return existing;
  const result = await db()
    .prepare(
      "INSERT INTO users (external_user_id, email, role, status) VALUES (?, ?, 'MEMBER', 'ACTIVE') RETURNING id, email, role, status",
    )
    .bind(user.externalUserId, user.email)
    .first<{ id: number; email: string; role: string; status: string }>();
  if (!result) throw new Error('사용자 생성에 실패했습니다.');
  return result;
}

export async function requireAdmin(user: AuthenticatedUser) {
  const current = await ensureUser(user);
  if (current.status !== 'ACTIVE') return null;
  const allowlist = (env.CONFERENCE_TRACKER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (current.role !== 'ADMIN' && !allowlist.includes(user.email.toLowerCase()))
    return null;
  return current;
}

export async function listConferences() {
  await ensureDemoData();
  const result = await db()
    .prepare(`
    SELECT c.*, m.id AS milestone_id, m.type AS milestone_type, m.group_name AS milestone_group_name, m.title AS milestone_title,
      m.event_at, m.end_at, m.original_timezone, m.time_confirmed, m.source_url, m.source_kind,
      rf.id AS field_id, rf.name_ko AS field_name_ko, rf.name_en AS field_name_en,
      crf.is_primary
    FROM conferences c
    LEFT JOIN milestones m ON m.conference_id = c.id
    LEFT JOIN conference_research_fields crf ON crf.conference_id = c.id
    LEFT JOIN research_fields rf ON rf.id = crf.research_field_id
    WHERE c.status = 'PUBLISHED'
    ORDER BY m.event_at ASC
  `)
    .all<Record<string, unknown>>();
  return result.results;
}

export async function listLinks(conferenceId?: number) {
  await ensureDemoData();
  const statement = conferenceId
    ? db()
        .prepare(
          'SELECT * FROM conference_links WHERE conference_id = ? AND is_active = 1 ORDER BY type',
        )
        .bind(conferenceId)
    : db().prepare(
        'SELECT * FROM conference_links WHERE is_active = 1 ORDER BY conference_id, type',
      );
  return (await statement.all<Record<string, unknown>>()).results;
}

export async function listPins(user: AuthenticatedUser) {
  await ensureDemoData();
  const current = await ensureUser(user);
  return (
    await db()
      .prepare(
        'SELECT conference_id, created_at FROM pins WHERE user_id = ? ORDER BY created_at DESC',
      )
      .bind(current.id)
      .all<{ conference_id: number; created_at: string }>()
  ).results;
}

export async function putPin(user: AuthenticatedUser, conferenceId: number) {
  await ensureDemoData();
  const current = await ensureUser(user);
  await db()
    .prepare(
      'INSERT INTO pins (user_id, conference_id) VALUES (?, ?) ON CONFLICT(user_id, conference_id) DO NOTHING',
    )
    .bind(current.id, conferenceId)
    .run();
  return { user_id: current.id, conference_id: conferenceId };
}

export async function removePin(user: AuthenticatedUser, conferenceId: number) {
  const current = await ensureUser(user);
  await db()
    .prepare('DELETE FROM pins WHERE user_id = ? AND conference_id = ?')
    .bind(current.id, conferenceId)
    .run();
}

export async function listCandidates(status = 'PENDING') {
  await ensureDemoData();
  return (
    await db()
      .prepare(
        'SELECT * FROM collection_candidates WHERE review_status = ? ORDER BY created_at DESC',
      )
      .bind(status)
      .all<Record<string, unknown>>()
  ).results;
}

export async function decideCandidate(
  user: AuthenticatedUser,
  candidateId: number,
  decision: 'APPROVED' | 'REJECTED' | 'DUPLICATE',
  reason?: string | null,
) {
  await ensureDemoData();
  const current = await requireAdmin(user);
  if (!current) return { kind: 'forbidden' as const };
  const candidate = await db()
    .prepare('SELECT id, review_status FROM collection_candidates WHERE id = ?')
    .bind(candidateId)
    .first<{ id: number; review_status: string }>();
  if (!candidate) return { kind: 'not_found' as const };
  if (candidate.review_status !== 'PENDING')
    return { kind: 'conflict' as const };
  await db()
    .prepare(
      'UPDATE collection_candidates SET review_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ? WHERE id = ?',
    )
    .bind(decision, current.id, reason ?? null, candidateId)
    .run();
  return { kind: 'ok' as const, id: candidateId, review_status: decision };
}

export async function createConference(
  user: AuthenticatedUser,
  input: ConferenceInput,
) {
  await ensureDemoData();
  const current = await requireAdmin(user);
  if (!current) return { kind: 'forbidden' as const };
  const result = await db()
    .prepare(`
    INSERT INTO conferences (series_id, name, acronym, edition_year, description, country_code, city, venue, format, status, verified_by, last_verified_at)
    VALUES ((SELECT id FROM conference_series WHERE lower(acronym) = lower(?) LIMIT 1), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    RETURNING *
  `)
    .bind(
      input.acronym ?? '',
      input.name,
      input.acronym ?? null,
      input.edition_year ?? null,
      input.description ?? null,
      input.country_code,
      input.city ?? null,
      input.venue ?? null,
      input.format,
      'DRAFT',
      current.id,
    )
    .first<Record<string, unknown>>();
  if (!result) throw new Error('학회 생성에 실패했습니다.');
  await replaceConferenceRelations(Number(result.id), input, [
    db()
      .prepare('UPDATE conferences SET status=? WHERE id=?')
      .bind(input.status || 'DRAFT', result.id),
  ]);
  return {
    kind: 'ok' as const,
    conference: await getAdminConference(Number(result.id)),
  };
}

async function replaceConferenceRelations(
  conferenceId: number,
  input: Pick<
    ConferenceInput,
    'research_field_ids' | 'primary_research_field_id' | 'milestones' | 'links'
  >,
  prefix: D1PreparedStatement[] = [],
) {
  const statements: D1PreparedStatement[] = [
    ...prefix,
    db()
      .prepare('DELETE FROM conference_research_fields WHERE conference_id = ?')
      .bind(conferenceId),
    db()
      .prepare('DELETE FROM milestones WHERE conference_id = ?')
      .bind(conferenceId),
    db()
      .prepare('DELETE FROM conference_links WHERE conference_id = ?')
      .bind(conferenceId),
  ];
  const fieldIds = [...new Set(input.research_field_ids ?? [])];
  for (const fieldId of fieldIds) {
    statements.push(
      db()
        .prepare(
          'INSERT INTO conference_research_fields (conference_id, research_field_id, is_primary) VALUES (?, ?, ?)',
        )
        .bind(
          conferenceId,
          fieldId,
          fieldId === input.primary_research_field_id ? 1 : 0,
        ),
    );
  }
  const ids = (input.milestones ?? []).flatMap((m) => (m.id ? [m.id] : []));
  const existingIds = new Set(
    (
      await db()
        .prepare('SELECT id FROM milestones WHERE conference_id=?')
        .bind(conferenceId)
        .all<{ id: number }>()
    ).results.map((m) => m.id),
  );
  if (
    ids.some((id) => !existingIds.has(id)) ||
    new Set(ids).size !== ids.length
  )
    throw new Error('일정 ID를 확인하세요.');
  statements.push(
    db()
      .prepare(
        'DELETE FROM milestones WHERE conference_id=?' +
          (ids.length
            ? ' AND id NOT IN (' + ids.map(() => '?').join(',') + ')'
            : ''),
      )
      .bind(conferenceId, ...ids),
  );
  for (const milestone of input.milestones ?? []) {
    statements.push(
      db()
        .prepare(
          "INSERT INTO milestones (id, conference_id, type, group_name, title, event_at, original_timezone, time_confirmed, note, end_at, source_url, source_text, source_kind, external_key) VALUES (?, ?, 'OFFICIAL_DATE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET group_name=excluded.group_name,title=excluded.title,event_at=excluded.event_at,original_timezone=excluded.original_timezone,time_confirmed=excluded.time_confirmed,note=excluded.note,end_at=excluded.end_at,source_url=excluded.source_url,source_text=excluded.source_text,source_kind=excluded.source_kind,external_key=excluded.external_key,updated_at=CURRENT_TIMESTAMP",
        )
        .bind(
          milestone.id ?? null,
          conferenceId,
          milestone.group_name?.trim() || null,
          milestone.title.trim(),
          milestone.event_at,
          milestone.original_timezone.trim(),
          milestone.time_confirmed === false ? 0 : 1,
          milestone.note?.trim() || null,
          milestone.end_at || null,
          milestone.source_url || null,
          milestone.source_text || null,
          milestone.source_kind || 'ADMIN',
          milestone.external_key || null,
        ),
    );
  }
  for (const link of input.links ?? []) {
    statements.push(
      db()
        .prepare(
          'INSERT INTO conference_links (conference_id, type, label, url, is_active) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(
          conferenceId,
          link.type,
          link.label.trim(),
          link.url.trim(),
          link.is_active === false ? 0 : 1,
        ),
    );
  }
  await db().batch(statements);
}

export async function getAdminConference(conferenceId: number) {
  await ensureDemoData();
  const conference = await db()
    .prepare('SELECT * FROM conferences WHERE id = ?')
    .bind(conferenceId)
    .first<Record<string, unknown>>();
  if (!conference) return null;
  const [fields, milestoneRows, links] = await Promise.all([
    db()
      .prepare(
        'SELECT research_field_id, is_primary FROM conference_research_fields WHERE conference_id = ? ORDER BY is_primary DESC, research_field_id',
      )
      .bind(conferenceId)
      .all<Record<string, unknown>>(),
    db()
      .prepare(
        'SELECT id, group_name, title, event_at, end_at, original_timezone, time_confirmed, note, source_url, source_text, source_kind, external_key FROM milestones WHERE conference_id = ? ORDER BY event_at',
      )
      .bind(conferenceId)
      .all<Record<string, unknown>>(),
    db()
      .prepare(
        'SELECT id, type, label, url, is_active FROM conference_links WHERE conference_id = ? ORDER BY type, label',
      )
      .bind(conferenceId)
      .all<Record<string, unknown>>(),
  ]);
  return {
    ...conference,
    research_fields: fields.results,
    milestones: milestoneRows.results.map((row) => ({
      ...row,
      time_confirmed: Boolean(row.time_confirmed),
    })),
    links: links.results.map((row) => ({
      ...row,
      is_active: Boolean(row.is_active),
    })),
  };
}

export async function updateConference(
  user: AuthenticatedUser,
  conferenceId: number,
  input: ConferenceInput,
) {
  await ensureDemoData();
  const current = await requireAdmin(user);
  if (!current) return { kind: 'forbidden' as const };
  const existing = await db()
    .prepare('SELECT id FROM conferences WHERE id = ?')
    .bind(conferenceId)
    .first<{ id: number }>();
  if (!existing) return { kind: 'not_found' as const };
  const updateStatement = db()
    .prepare(`
      UPDATE conferences
      SET series_id = COALESCE(series_id, (SELECT id FROM conference_series WHERE lower(acronym) = lower(?) LIMIT 1)), name = ?, acronym = ?, edition_year = ?, description = ?, country_code = ?, city = ?, venue = ?, format = ?, status = ?, verified_by = ?, last_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(
      input.acronym ?? '',
      input.name,
      input.acronym ?? null,
      input.edition_year ?? null,
      input.description ?? null,
      input.country_code,
      input.city ?? null,
      input.venue ?? null,
      input.format,
      input.status ?? 'DRAFT',
      current.id,
      conferenceId,
    );
  await replaceConferenceRelations(conferenceId, input, [updateStatement]);
  return {
    kind: 'ok' as const,
    conference: await getAdminConference(conferenceId),
  };
}

export async function listSources() {
  await ensureDemoData();
  return (
    await db()
      .prepare('SELECT * FROM source_sites ORDER BY name')
      .all<Record<string, unknown>>()
  ).results;
}

export async function createSourceSite(
  user: AuthenticatedUser,
  input: SourceSiteInput,
) {
  await ensureDemoData();
  if (!(await requireAdmin(user))) return { kind: 'forbidden' as const };
  const source = await db()
    .prepare(
      'INSERT INTO source_sites (name, base_url, source_type, is_active) VALUES (?, ?, ?, ?) RETURNING *',
    )
    .bind(
      input.name,
      input.base_url,
      input.source_type,
      input.is_active === false ? 0 : 1,
    )
    .first<Record<string, unknown>>();
  return { kind: 'ok' as const, source };
}

export async function updateSourceSite(
  user: AuthenticatedUser,
  sourceSiteId: number,
  input: SourceSiteInput,
) {
  await ensureDemoData();
  if (!(await requireAdmin(user))) return { kind: 'forbidden' as const };
  const source = await db()
    .prepare(`
      UPDATE source_sites
      SET name = ?, base_url = ?, source_type = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `)
    .bind(
      input.name,
      input.base_url,
      input.source_type,
      input.is_active === false ? 0 : 1,
      sourceSiteId,
    )
    .first<Record<string, unknown>>();
  if (!source) return { kind: 'not_found' as const };
  return { kind: 'ok' as const, source };
}

export async function listResearchFields() {
  await ensureDemoData();
  return (
    await db()
      .prepare(
        'SELECT * FROM research_fields WHERE is_active = 1 ORDER BY depth, name_ko',
      )
      .all<Record<string, unknown>>()
  ).results;
}

export async function listAdminConferences() {
  await ensureDemoData();
  return (
    await db()
      .prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM milestones m WHERE m.conference_id = c.id) AS milestone_count,
          (SELECT MIN(m.event_at) FROM milestones m WHERE m.conference_id = c.id AND m.event_at >= CURRENT_TIMESTAMP) AS next_milestone_at,
          (SELECT COUNT(*) FROM conference_research_fields crf WHERE crf.conference_id = c.id) AS research_field_count
        FROM conferences c
        ORDER BY c.updated_at DESC, c.id DESC
      `)
      .all<Record<string, unknown>>()
  ).results;
}

export async function getAdminStats() {
  await ensureDemoData();
  const [published, milestones, sources] = await Promise.all([
    db()
      .prepare(
        "SELECT COUNT(*) AS count FROM conferences WHERE status = 'PUBLISHED'",
      )
      .first<{ count: number }>(),
    db()
      .prepare('SELECT COUNT(*) AS count FROM milestones')
      .first<{ count: number }>(),
    db()
      .prepare('SELECT COUNT(*) AS count FROM source_sites WHERE is_active = 1')
      .first<{ count: number }>(),
  ]);
  return {
    published_conferences: published?.count ?? 0,
    total_milestones: milestones?.count ?? 0,
    active_sources: sources?.count ?? 0,
  };
}

export function validateConferenceSchedules(input: ConferenceInput) {
  for (const link of input.links || []) {
    if (!['https:', 'http:'].includes(new URL(link.url).protocol))
      throw new Error('관련 링크에는 HTTP(S) URL만 사용할 수 있습니다.');
  }
  if (
    !['DRAFT', 'PUBLISHED', 'HIDDEN'].includes(input.status || 'DRAFT') ||
    !['ONSITE', 'ONLINE', 'HYBRID', 'UNKNOWN'].includes(input.format)
  )
    throw new Error('공개 상태 또는 개최 방식을 확인하세요.');
  for (const item of input.milestones || []) {
    const timed = item.time_confirmed !== false;
    item.event_at = normalizeScheduleDate(
      item.event_at,
      item.original_timezone,
      timed,
    );
    item.end_at = item.end_at
      ? normalizeScheduleDate(item.end_at, item.original_timezone, timed)
      : null;
    if (item.end_at && item.end_at < item.event_at)
      throw new Error('종료 일시는 시작 일시보다 빠를 수 없습니다.');
  }
  if (input.status === 'PUBLISHED' && !input.milestones?.length)
    throw new Error('공개하려면 확인된 일정이 하나 이상 필요합니다.');
}
