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
  research_field_ids?: number[];
  primary_research_field_id?: number | null;
  milestones?: Array<{
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

const demoMilestoneRows = [
  [
    1,
    1,
    'SUBMISSION_DEADLINE',
    'Papers',
    'Submission Due',
    '2026-09-10T23:59:00Z',
    'AoE',
    1,
  ],
  [
    2,
    2,
    'SUBMISSION_OPEN',
    'Regular Papers',
    'Submission Opens',
    '2026-09-08T00:00:00Z',
    'Asia/Seoul',
    1,
  ],
  [
    3,
    3,
    'SUBMISSION_DEADLINE',
    'Main Track',
    'Submission Deadline',
    '2026-09-12T23:59:00Z',
    'AoE',
    1,
  ],
  [
    4,
    4,
    'NOTIFICATION',
    'Research Track',
    'Author Notification',
    '2026-09-18T17:00:00Z',
    'UTC',
    1,
  ],
  [
    5,
    5,
    'REGISTRATION_DEADLINE',
    'Authors',
    'Author Registration Deadline',
    '2026-09-22T23:59:00Z',
    'AoE',
    1,
  ],
  [
    6,
    6,
    'CAMERA_READY_DEADLINE',
    'Technical Papers',
    'Final Submission Deadline',
    '2026-09-25T23:59:00Z',
    'AoE',
    1,
  ],
  [
    7,
    1,
    'REVIEWS_RELEASED',
    'Papers',
    'Reviews Released',
    '2026-11-05T12:00:00Z',
    'AoE',
    0,
  ],
  [
    8,
    1,
    'RESUBMISSION_DEADLINE',
    'Papers',
    'Resubmission Due',
    '2026-12-03T23:59:00Z',
    'AoE',
    1,
  ],
  [
    9,
    1,
    'NOTIFICATION',
    'Papers',
    'Notification',
    '2026-12-17T12:00:00Z',
    'AoE',
    0,
  ],
  [
    10,
    1,
    'SUBMISSION_DEADLINE',
    'Posters',
    'Submission Due',
    '2027-01-21T23:59:00Z',
    'AoE',
    1,
  ],
  [
    11,
    1,
    'NOTIFICATION',
    'Posters',
    'Notification',
    '2027-02-18T12:00:00Z',
    'AoE',
    0,
  ],
  [
    12,
    1,
    'SUBMISSION_DEADLINE',
    'Interactive Demos',
    'Submission Due',
    '2027-01-21T23:59:00Z',
    'AoE',
    1,
  ],
  [
    13,
    1,
    'NOTIFICATION',
    'Interactive Demos',
    'Notification',
    '2027-02-18T12:00:00Z',
    'AoE',
    0,
  ],
  [
    14,
    1,
    'SUBMISSION_DEADLINE',
    'Panels',
    'Submission Due',
    '2026-11-19T23:59:00Z',
    'AoE',
    1,
  ],
  [
    15,
    1,
    'NOTIFICATION',
    'Panels',
    'Notification',
    '2027-01-14T12:00:00Z',
    'AoE',
    0,
  ],
  [
    16,
    1,
    'SUBMISSION_DEADLINE',
    'Workshops',
    'Organizer Submission Due',
    '2026-10-01T23:59:00Z',
    'AoE',
    1,
  ],
  [
    17,
    1,
    'NOTIFICATION',
    'Workshops',
    'Notification',
    '2026-11-19T12:00:00Z',
    'AoE',
    0,
  ],
  [
    18,
    1,
    'WEBSITE_DEADLINE',
    'Workshops',
    'Accepted Workshops Websites Up',
    '2026-12-17T12:00:00Z',
    'AoE',
    0,
  ],
  [
    19,
    1,
    'SUBMISSION_DEADLINE',
    'Meet-Ups',
    'Submission Due',
    '2026-10-01T23:59:00Z',
    'AoE',
    1,
  ],
  [
    20,
    1,
    'NOTIFICATION',
    'Meet-Ups',
    'Notification',
    '2026-11-19T12:00:00Z',
    'AoE',
    0,
  ],
  [
    21,
    1,
    'SUBMISSION_DEADLINE',
    'Student Research Competition',
    'Submission Due',
    '2027-01-21T23:59:00Z',
    'AoE',
    1,
  ],
  [
    22,
    1,
    'NOTIFICATION',
    'Student Research Competition',
    'Notification',
    '2027-02-18T12:00:00Z',
    'AoE',
    0,
  ],
] as const;

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

async function syncDemoMilestones() {
  const demo = await db()
    .prepare("SELECT id FROM conferences WHERE id = 1 AND acronym = 'CHI 2027'")
    .first<{ id: number }>();
  if (!demo) return;
  const current = await db()
    .prepare(
      "SELECT id FROM milestones WHERE id = 22 AND conference_id = 1 AND group_name = 'Student Research Competition' AND title = 'Notification'",
    )
    .first<{ id: number }>();
  if (current) return;
  const statements = demoMilestoneRows.map((row) =>
    db()
      .prepare(`
    INSERT INTO milestones (id, conference_id, type, group_name, title, event_at, original_timezone, time_confirmed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      group_name = excluded.group_name,
      title = excluded.title,
      event_at = excluded.event_at,
      original_timezone = excluded.original_timezone,
      time_confirmed = excluded.time_confirmed,
      updated_at = CURRENT_TIMESTAMP
    WHERE milestones.conference_id = excluded.conference_id
  `)
      .bind(...row),
  );
  await db().batch(statements);
}

export async function ensureDemoData() {
  const count = await db()
    .prepare('SELECT COUNT(*) AS count FROM conferences')
    .first<{ count: number }>();
  if ((count?.count ?? 0) > 0) {
    await Promise.all([syncDemoMilestones(), syncAcmCcsFields()]);
    return;
  }

  const conferenceRows = [
    [
      1,
      'ACM Conference on Human Factors in Computing Systems',
      'CHI 2027',
      2027,
      '사람과 컴퓨팅 기술의 상호작용을 다루는 국제 학술대회입니다.',
      'ES',
      'Barcelona',
      null,
      'ONSITE',
      'PUBLISHED',
    ],
    [
      2,
      '한국소프트웨어종합학술대회',
      'KSC 2026',
      2026,
      '컴퓨팅 전 분야의 연구 성과를 공유하는 국내 종합 학술대회입니다.',
      'KR',
      'Jeju',
      null,
      'ONSITE',
      'PUBLISHED',
    ],
    [
      3,
      'AAAI Conference on Artificial Intelligence',
      'AAAI 2027',
      2027,
      '인공지능 이론과 응용 전반의 최신 연구를 다루는 국제 학술대회입니다.',
      'CA',
      'Vancouver',
      null,
      'HYBRID',
      'PUBLISHED',
    ],
    [
      4,
      'International Conference on Software Engineering',
      'ICSE 2027',
      2027,
      '소프트웨어 공학 분야의 연구와 산업 사례를 공유하는 국제 학술대회입니다.',
      'KR',
      'Seoul',
      null,
      'ONSITE',
      'PUBLISHED',
    ],
    [
      5,
      'Conference on Neural Information Processing Systems',
      'NeurIPS 2026',
      2026,
      '머신러닝과 계산 신경과학 분야의 연구를 폭넓게 다루는 학술대회입니다.',
      'US',
      'San Diego',
      null,
      'HYBRID',
      'PUBLISHED',
    ],
    [
      6,
      'ACM Symposium on User Interface Software and Technology',
      'UIST 2026',
      2026,
      '사용자 인터페이스 기술과 상호작용 기법을 다루는 국제 심포지엄입니다.',
      'KR',
      'Busan',
      null,
      'ONSITE',
      'PUBLISHED',
    ],
  ];
  const fieldRows = [
    [1, '10002944', '일반 및 참조', 'General and reference'],
    [2, '10010147', '컴퓨팅 방법론', 'Computing methodologies'],
    [
      3,
      '10011007',
      '소프트웨어 및 소프트웨어 공학',
      'Software and its engineering',
    ],
    [4, '10003120', '인간 중심 컴퓨팅', 'Human-centered computing'],
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
  const fieldLinks = [
    [1, 4],
    [2, 3],
    [3, 2],
    [4, 3],
    [5, 2],
    [6, 4],
  ];
  const statements: D1PreparedStatement[] = [];

  for (const row of fieldRows) {
    statements.push(
      db()
        .prepare(
          'INSERT INTO research_fields (id, acm_ccs_code, name_ko, name_en, depth, is_active) VALUES (?, ?, ?, ?, 0, 1)',
        )
        .bind(...row),
    );
  }
  for (const row of conferenceRows) {
    statements.push(
      db()
        .prepare(
          'INSERT INTO conferences (id, name, acronym, edition_year, description, country_code, city, venue, format, status, last_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        )
        .bind(...row),
    );
  }
  for (const row of fieldLinks) {
    statements.push(
      db()
        .prepare(
          'INSERT INTO conference_research_fields (conference_id, research_field_id, is_primary) VALUES (?, ?, 1)',
        )
        .bind(...row),
    );
  }
  for (const row of demoMilestoneRows) {
    statements.push(
      db()
        .prepare(
          'INSERT INTO milestones (id, conference_id, type, group_name, title, event_at, original_timezone, time_confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(...row),
    );
  }
  for (const row of linkRows) {
    statements.push(
      db()
        .prepare(
          'INSERT INTO conference_links (id, conference_id, type, label, url, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        )
        .bind(...row),
    );
  }
  statements.push(
    db().prepare(
      "INSERT INTO source_sites (id, name, base_url, source_type, is_active, last_collected_at) VALUES (1, 'ACM Digital Library', 'https://dl.acm.org/', 'WEB_PAGE', 1, CURRENT_TIMESTAMP)",
    ),
  );
  statements.push(
    db().prepare(
      "INSERT INTO source_sites (id, name, base_url, source_type, is_active, last_collected_at) VALUES (2, 'WikiCFP', 'http://www.wikicfp.com/', 'WEB_PAGE', 1, CURRENT_TIMESTAMP)",
    ),
  );
  statements.push(
    db().prepare(
      "INSERT INTO collection_runs (id, source_site_id, status, started_at, finished_at, collected_count) VALUES (1, 1, 'SUCCESS', datetime('now', '-2 hours'), datetime('now', '-119 minutes'), 2)",
    ),
  );
  statements.push(
    db()
      .prepare(
        'INSERT INTO collection_candidates (id, collection_run_id, source_url, extracted_name, extracted_acronym, extracted_organization, extracted_country_code, extracted_city, extracted_format, raw_payload, review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        1,
        1,
        'https://example.org/cfp/cloud-2027',
        'International Conference on Cloud Computing',
        'CLOUD 2027',
        'IEEE',
        'JP',
        'Tokyo',
        'HYBRID',
        JSON.stringify({
          deadline: '2026-10-14T23:59:00Z',
          timezone: 'AoE',
          category: 'Cloud computing',
        }),
        'PENDING',
      ),
  );
  statements.push(
    db()
      .prepare(
        'INSERT INTO collection_candidates (id, collection_run_id, source_url, extracted_name, extracted_acronym, extracted_organization, extracted_country_code, extracted_city, extracted_format, raw_payload, review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        2,
        1,
        'https://example.org/cfp/data-2027',
        'Korea Data Engineering Conference',
        'KDEC 2027',
        '한국정보과학회',
        'KR',
        'Daejeon',
        'ONSITE',
        JSON.stringify({
          deadline: '2026-11-02T14:59:00Z',
          timezone: 'Asia/Seoul',
          category: 'Data management',
        }),
        'PENDING',
      ),
  );
  await db().batch(statements);
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
      m.event_at, m.end_at, m.original_timezone, m.time_confirmed,
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
    INSERT INTO conferences (name, acronym, edition_year, description, country_code, city, venue, format, status, verified_by, last_verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    RETURNING *
  `)
    .bind(
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
    )
    .first<Record<string, unknown>>();
  if (!result) throw new Error('학회 생성에 실패했습니다.');
  await replaceConferenceRelations(Number(result.id), input);
  return { kind: 'ok' as const, conference: result };
}

async function replaceConferenceRelations(
  conferenceId: number,
  input: Pick<
    ConferenceInput,
    'research_field_ids' | 'primary_research_field_id' | 'milestones' | 'links'
  >,
) {
  const statements: D1PreparedStatement[] = [
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
  for (const milestone of input.milestones ?? []) {
    statements.push(
      db()
        .prepare(
          "INSERT INTO milestones (conference_id, type, group_name, title, event_at, original_timezone, time_confirmed, note) VALUES (?, 'OFFICIAL_DATE', ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          conferenceId,
          milestone.group_name?.trim() || null,
          milestone.title.trim(),
          milestone.event_at,
          milestone.original_timezone.trim(),
          milestone.time_confirmed === false ? 0 : 1,
          milestone.note?.trim() || null,
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
        'SELECT id, group_name, title, event_at, original_timezone, time_confirmed, note FROM milestones WHERE conference_id = ? ORDER BY event_at',
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
    milestones: milestoneRows.results,
    links: links.results,
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
  await db()
    .prepare(`
      UPDATE conferences
      SET name = ?, acronym = ?, edition_year = ?, description = ?, country_code = ?, city = ?, venue = ?, format = ?, status = ?, verified_by = ?, last_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(
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
    )
    .run();
  await replaceConferenceRelations(conferenceId, input);
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
