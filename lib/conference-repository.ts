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
  format: 'ONSITE' | 'ONLINE' | 'HYBRID';
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
};

function db(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable.');
  return env.DB;
}

export function readAuthenticatedUser(headers: Headers): AuthenticatedUser | null {
  const externalUserId = headers.get('oai-authenticated-user-id');
  const email = headers.get('oai-authenticated-user-email');
  if (!externalUserId || !email) return null;
  return { externalUserId, email };
}

export async function ensureDemoData() {
  const count = await db().prepare('SELECT COUNT(*) AS count FROM conferences').first<{ count: number }>();
  if ((count?.count ?? 0) > 0) return;

  const conferenceRows = [
    [1, 'ACM Conference on Human Factors in Computing Systems', 'CHI 2027', 2027, '사람과 컴퓨팅 기술의 상호작용을 다루는 국제 학술대회입니다.', 'ES', 'Barcelona', null, 'ONSITE', 'PUBLISHED'],
    [2, '한국소프트웨어종합학술대회', 'KSC 2026', 2026, '컴퓨팅 전 분야의 연구 성과를 공유하는 국내 종합 학술대회입니다.', 'KR', 'Jeju', null, 'ONSITE', 'PUBLISHED'],
    [3, 'AAAI Conference on Artificial Intelligence', 'AAAI 2027', 2027, '인공지능 이론과 응용 전반의 최신 연구를 다루는 국제 학술대회입니다.', 'CA', 'Vancouver', null, 'HYBRID', 'PUBLISHED'],
    [4, 'International Conference on Software Engineering', 'ICSE 2027', 2027, '소프트웨어 공학 분야의 연구와 산업 사례를 공유하는 국제 학술대회입니다.', 'KR', 'Seoul', null, 'ONSITE', 'PUBLISHED'],
    [5, 'Conference on Neural Information Processing Systems', 'NeurIPS 2026', 2026, '머신러닝과 계산 신경과학 분야의 연구를 폭넓게 다루는 학술대회입니다.', 'US', 'San Diego', null, 'HYBRID', 'PUBLISHED'],
    [6, 'ACM Symposium on User Interface Software and Technology', 'UIST 2026', 2026, '사용자 인터페이스 기술과 상호작용 기법을 다루는 국제 심포지엄입니다.', 'KR', 'Busan', null, 'ONSITE', 'PUBLISHED'],
  ];
  const fieldRows = [
    [1, '10002944', '일반 및 참조', 'General and reference'],
    [2, '10010147', '컴퓨팅 방법론', 'Computing methodologies'],
    [3, '10011007', '소프트웨어 및 소프트웨어 공학', 'Software and its engineering'],
    [4, '10003120', '인간 중심 컴퓨팅', 'Human-centered computing'],
  ];
  const milestoneRows = [
    [1, 1, 'ABSTRACT_DEADLINE', '초록 제출 마감', '2026-09-03T23:59:00Z', 'AoE'],
    [2, 2, 'SUBMISSION_OPEN', '논문 제출 시작', '2026-09-08T00:00:00Z', 'Asia/Seoul'],
    [3, 3, 'PAPER_DEADLINE', '논문 제출 마감', '2026-09-12T23:59:00Z', 'AoE'],
    [4, 4, 'ACCEPTANCE_NOTIFICATION', '채택 결과 발표', '2026-09-18T17:00:00Z', 'UTC'],
    [5, 5, 'AUTHOR_REGISTRATION_DEADLINE', '저자 등록 마감', '2026-09-22T23:59:00Z', 'AoE'],
    [6, 6, 'CAMERA_READY_DEADLINE', '카메라 레디 마감', '2026-09-25T23:59:00Z', 'AoE'],
  ];
  const linkRows = [
    [1, 1, 'OFFICIAL', '공식 홈페이지', 'https://chi2027.acm.org/'],
    [2, 1, 'SUBMISSION', '논문 제출', 'https://new.precisionconference.com/'],
    [3, 2, 'OFFICIAL', '공식 홈페이지', 'https://www.kiise.or.kr/'],
    [4, 3, 'OFFICIAL', '공식 홈페이지', 'https://aaai.org/'],
    [5, 3, 'CFP', 'Call for Papers', 'https://aaai.org/conference/'],
    [6, 4, 'OFFICIAL', '공식 홈페이지', 'https://conf.researchr.org/'],
    [7, 5, 'OFFICIAL', '공식 홈페이지', 'https://neurips.cc/'],
    [8, 6, 'OFFICIAL', '공식 홈페이지', 'https://uist.acm.org/'],
  ];
  const fieldLinks = [[1, 4], [2, 3], [3, 2], [4, 3], [5, 2], [6, 4]];
  const statements: D1PreparedStatement[] = [];

  for (const row of fieldRows) {
    statements.push(db().prepare('INSERT INTO research_fields (id, acm_ccs_code, name_ko, name_en, depth, is_active) VALUES (?, ?, ?, ?, 0, 1)').bind(...row));
  }
  for (const row of conferenceRows) {
    statements.push(db().prepare('INSERT INTO conferences (id, name, acronym, edition_year, description, country_code, city, venue, format, status, last_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').bind(...row));
  }
  for (const row of fieldLinks) {
    statements.push(db().prepare('INSERT INTO conference_research_fields (conference_id, research_field_id, is_primary) VALUES (?, ?, 1)').bind(...row));
  }
  for (const row of milestoneRows) {
    statements.push(db().prepare('INSERT INTO milestones (id, conference_id, type, title, event_at, original_timezone, time_confirmed) VALUES (?, ?, ?, ?, ?, ?, 1)').bind(...row));
  }
  for (const row of linkRows) {
    statements.push(db().prepare('INSERT INTO conference_links (id, conference_id, type, label, url, is_active) VALUES (?, ?, ?, ?, ?, 1)').bind(...row));
  }
  statements.push(db().prepare("INSERT INTO source_sites (id, name, base_url, source_type, is_active, last_collected_at) VALUES (1, 'ACM Digital Library', 'https://dl.acm.org/', 'WEB_PAGE', 1, CURRENT_TIMESTAMP)"));
  statements.push(db().prepare("INSERT INTO source_sites (id, name, base_url, source_type, is_active, last_collected_at) VALUES (2, 'WikiCFP', 'http://www.wikicfp.com/', 'WEB_PAGE', 1, CURRENT_TIMESTAMP)"));
  statements.push(db().prepare("INSERT INTO collection_runs (id, source_site_id, status, started_at, finished_at, collected_count) VALUES (1, 1, 'SUCCESS', datetime('now', '-2 hours'), datetime('now', '-119 minutes'), 2)"));
  statements.push(db().prepare('INSERT INTO collection_candidates (id, collection_run_id, source_url, extracted_name, extracted_acronym, extracted_organization, extracted_country_code, extracted_city, extracted_format, raw_payload, review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(1, 1, 'https://example.org/cfp/cloud-2027', 'International Conference on Cloud Computing', 'CLOUD 2027', 'IEEE', 'JP', 'Tokyo', 'HYBRID', JSON.stringify({ deadline: '2026-10-14T23:59:00Z', timezone: 'AoE', category: 'Cloud computing' }), 'PENDING'));
  statements.push(db().prepare('INSERT INTO collection_candidates (id, collection_run_id, source_url, extracted_name, extracted_acronym, extracted_organization, extracted_country_code, extracted_city, extracted_format, raw_payload, review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(2, 1, 'https://example.org/cfp/data-2027', 'Korea Data Engineering Conference', 'KDEC 2027', '한국정보과학회', 'KR', 'Daejeon', 'ONSITE', JSON.stringify({ deadline: '2026-11-02T14:59:00Z', timezone: 'Asia/Seoul', category: 'Data management' }), 'PENDING'));
  await db().batch(statements);
}

export async function ensureUser(user: AuthenticatedUser) {
  const existing = await db().prepare('SELECT id, email, role, status FROM users WHERE external_user_id = ?').bind(user.externalUserId).first<{ id: number; email: string; role: string; status: string }>();
  if (existing) return existing;
  const result = await db().prepare("INSERT INTO users (external_user_id, email, role, status) VALUES (?, ?, 'MEMBER', 'ACTIVE') RETURNING id, email, role, status").bind(user.externalUserId, user.email).first<{ id: number; email: string; role: string; status: string }>();
  if (!result) throw new Error('사용자 생성에 실패했습니다.');
  return result;
}

export async function requireAdmin(user: AuthenticatedUser) {
  const current = await ensureUser(user);
  const allowlist = (env.CONFERENCE_TRACKER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (current.role !== 'ADMIN' && !allowlist.includes(user.email.toLowerCase())) return null;
  return current;
}

export async function listConferences() {
  await ensureDemoData();
  const result = await db().prepare(`
    SELECT c.*, m.id AS milestone_id, m.type AS milestone_type, m.title AS milestone_title,
      m.event_at, m.end_at, m.original_timezone, m.time_confirmed,
      rf.id AS field_id, rf.name_ko AS field_name_ko, rf.name_en AS field_name_en,
      crf.is_primary
    FROM conferences c
    LEFT JOIN milestones m ON m.conference_id = c.id
    LEFT JOIN conference_research_fields crf ON crf.conference_id = c.id
    LEFT JOIN research_fields rf ON rf.id = crf.research_field_id
    WHERE c.status = 'PUBLISHED'
    ORDER BY m.event_at ASC
  `).all<Record<string, unknown>>();
  return result.results;
}

export async function listLinks(conferenceId?: number) {
  await ensureDemoData();
  const statement = conferenceId
    ? db().prepare('SELECT * FROM conference_links WHERE conference_id = ? AND is_active = 1 ORDER BY type').bind(conferenceId)
    : db().prepare('SELECT * FROM conference_links WHERE is_active = 1 ORDER BY conference_id, type');
  return (await statement.all<Record<string, unknown>>()).results;
}

export async function listPins(user: AuthenticatedUser) {
  await ensureDemoData();
  const current = await ensureUser(user);
  return (await db().prepare('SELECT conference_id, created_at FROM pins WHERE user_id = ? ORDER BY created_at DESC').bind(current.id).all<{ conference_id: number; created_at: string }>()).results;
}

export async function putPin(user: AuthenticatedUser, conferenceId: number) {
  await ensureDemoData();
  const current = await ensureUser(user);
  await db().prepare('INSERT INTO pins (user_id, conference_id) VALUES (?, ?) ON CONFLICT(user_id, conference_id) DO NOTHING').bind(current.id, conferenceId).run();
  return { user_id: current.id, conference_id: conferenceId };
}

export async function removePin(user: AuthenticatedUser, conferenceId: number) {
  const current = await ensureUser(user);
  await db().prepare('DELETE FROM pins WHERE user_id = ? AND conference_id = ?').bind(current.id, conferenceId).run();
}

export async function listCandidates(status = 'PENDING') {
  await ensureDemoData();
  return (await db().prepare('SELECT * FROM collection_candidates WHERE review_status = ? ORDER BY created_at DESC').bind(status).all<Record<string, unknown>>()).results;
}

export async function decideCandidate(user: AuthenticatedUser, candidateId: number, decision: 'APPROVED' | 'REJECTED' | 'DUPLICATE', reason?: string | null) {
  await ensureDemoData();
  const current = await requireAdmin(user);
  if (!current) return { kind: 'forbidden' as const };
  const candidate = await db().prepare('SELECT id, review_status FROM collection_candidates WHERE id = ?').bind(candidateId).first<{ id: number; review_status: string }>();
  if (!candidate) return { kind: 'not_found' as const };
  if (candidate.review_status !== 'PENDING') return { kind: 'conflict' as const };
  await db().prepare('UPDATE collection_candidates SET review_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ? WHERE id = ?').bind(decision, current.id, reason ?? null, candidateId).run();
  return { kind: 'ok' as const, id: candidateId, review_status: decision };
}

export async function createConference(user: AuthenticatedUser, input: ConferenceInput) {
  await ensureDemoData();
  const current = await requireAdmin(user);
  if (!current) return { kind: 'forbidden' as const };
  const result = await db().prepare(`
    INSERT INTO conferences (name, acronym, edition_year, description, country_code, city, venue, format, status, verified_by, last_verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    RETURNING *
  `).bind(input.name, input.acronym ?? null, input.edition_year ?? null, input.description ?? null, input.country_code, input.city ?? null, input.venue ?? null, input.format, input.status ?? 'DRAFT', current.id).first<Record<string, unknown>>();
  return { kind: 'ok' as const, conference: result };
}

export async function listSources() {
  await ensureDemoData();
  return (await db().prepare('SELECT * FROM source_sites ORDER BY name').all<Record<string, unknown>>()).results;
}

export async function listResearchFields() {
  await ensureDemoData();
  return (await db().prepare('SELECT * FROM research_fields WHERE is_active = 1 ORDER BY depth, name_ko').all<Record<string, unknown>>()).results;
}

export async function listAdminConferences() {
  await ensureDemoData();
  return (await db().prepare('SELECT * FROM conferences ORDER BY updated_at DESC, id DESC').all<Record<string, unknown>>()).results;
}

export async function getAdminStats() {
  await ensureDemoData();
  const [pending, published, sources] = await Promise.all([
    db().prepare("SELECT COUNT(*) AS count FROM collection_candidates WHERE review_status = 'PENDING'").first<{ count: number }>(),
    db().prepare("SELECT COUNT(*) AS count FROM conferences WHERE status = 'PUBLISHED'").first<{ count: number }>(),
    db().prepare('SELECT COUNT(*) AS count FROM source_sites WHERE is_active = 1').first<{ count: number }>(),
  ]);
  return {
    pending_candidates: pending?.count ?? 0,
    published_conferences: published?.count ?? 0,
    active_sources: sources?.count ?? 0,
  };
}
