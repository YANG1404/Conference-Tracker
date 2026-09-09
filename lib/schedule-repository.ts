import { env } from 'cloudflare:workers';
import {
  CCF_URL,
  canonicalKey,
  ccfSnapshot,
  extractOfficial,
  fetchText,
  hashText,
  pageText,
  parseCcf,
  safeUrl,
  type Snapshot,
} from './schedule-collectors';
import { ensureDemoData } from './conference-repository';

function db() {
  if (!env.DB) throw new Error('DB가 없습니다.');
  return env.DB;
}
type Feed = {
  id: number;
  conference_id: number | null;
  kind: string;
  url: string;
  content_hash: string | null;
  payload: string | null;
  enabled: number;
  status: string;
};
const later = (hours: number) =>
  new Date(Date.now() + hours * 3600000).toISOString();

export async function listScheduleFeeds(conferenceId?: number) {
  const query =
    'SELECT f.*, c.acronym, c.edition_year FROM schedule_feeds f LEFT JOIN conferences c ON c.id=f.conference_id';
  const result = conferenceId
    ? await db()
        .prepare(query + ' WHERE f.conference_id=? ORDER BY f.kind')
        .bind(conferenceId)
        .all()
    : await db()
        .prepare(query + ' ORDER BY f.last_checked_at DESC, f.id DESC')
        .all();
  return result.results.map((row) => ({
    ...row,
    payload: row.payload ? JSON.parse(row.payload as string) : null,
  }));
}
async function lock(id: number) {
  const row = await db()
    .prepare(
      "UPDATE schedule_feeds SET lease_until=?,status='RUNNING',last_checked_at=?,error_message=NULL WHERE id=? AND (lease_until IS NULL OR lease_until < ?) RETURNING id",
    )
    .bind(later(0.1), new Date().toISOString(), id, new Date().toISOString())
    .first();
  if (!row) throw new Error('이미 수집 중입니다. 잠시 후 다시 시도하세요.');
}
async function finish(
  id: number,
  status: string,
  hours: number,
  message: string | null = null,
) {
  await db()
    .prepare(
      'UPDATE schedule_feeds SET status=?,lease_until=NULL,next_check_at=?,error_message=? WHERE id=?',
    )
    .bind(status, later(hours), message, id)
    .run();
}
async function storeSnapshot(
  id: number,
  payload: Snapshot | Record<string, unknown>,
  hash: string,
) {
  await db()
    .prepare(
      'UPDATE schedule_feeds SET payload=?,content_hash=?,last_success_at=? WHERE id=?',
    )
    .bind(JSON.stringify(payload), hash, new Date().toISOString(), id)
    .run();
}
export async function configureOfficial(
  conferenceId: number,
  url: string,
  enabled: boolean,
) {
  safeUrl(url);
  const conference = await db()
    .prepare('SELECT id FROM conferences WHERE id=?')
    .bind(conferenceId)
    .first();
  if (!conference) throw new Error('학회를 찾을 수 없습니다.');
  await db()
    .prepare(
      "INSERT INTO schedule_feeds (source_key,conference_id,kind,url,enabled) VALUES (?,?, 'OFFICIAL',?,?) ON CONFLICT(source_key) DO UPDATE SET content_hash=CASE WHEN url=excluded.url THEN content_hash ELSE NULL END, url=excluded.url, enabled=excluded.enabled",
    )
    .bind('official:' + conferenceId, conferenceId, url, enabled ? 1 : 0)
    .run();
  return await db()
    .prepare('SELECT id FROM schedule_feeds WHERE source_key=?')
    .bind('official:' + conferenceId)
    .first<{ id: number }>();
}
export async function syncCcf() {
  await ensureDemoData();
  await db()
    .prepare(
      "INSERT OR IGNORE INTO schedule_feeds(source_key,kind,url,enabled) VALUES ('ccf:all','CCF_INDEX',?,1)",
    )
    .bind(CCF_URL)
    .run();
  const feed = await db()
    .prepare("SELECT * FROM schedule_feeds WHERE source_key='ccf:all'")
    .first<Feed>();
  if (!feed) throw new Error('수집 설정 실패');
  await lock(feed.id);
  try {
    const source = await fetchText(CCF_URL, 8_000_000);
    const hash = await hashText(source.text);
    const catalog = (
      await db()
        .prepare(
          'SELECT id,acronym,name,dblp_key FROM conference_series WHERE is_active=1',
        )
        .all<{ id: number; acronym: string; name: string; dblp_key: string }>()
    ).results;
    if (!catalog.length)
      throw new Error('먼저 Gist 학회 카탈로그를 동기화하세요.');
    // Retire only untouched seeded demo records; retain IDs, pins and all saved data.
    await db()
      .prepare(
        "UPDATE conferences SET status='DRAFT' WHERE id IN (1,3,4,5,6) AND verified_by IS NULL AND created_at='2026-09-08 11:33:08' AND updated_at=created_at AND status='PUBLISHED'",
      )
      .run();
    const byDblp = new Map(
      catalog.map((row) => [canonicalKey(row.dblp_key), row]),
    );
    const byName = new Map(
      catalog.map((row) => [canonicalKey(row.acronym), row]),
    );
    const previous = feed.payload ? JSON.parse(feed.payload) : {};
    const cursor =
      feed.content_hash === hash ? Number(previous.next_cursor || 0) : 0;
    let visited = 0;
    const matchedIds = new Set<number>();
    let editions = cursor ? Number(previous.editions || 0) : 0;
    let scheduleCount = cursor ? Number(previous.schedules || 0) : 0;
    const unmatched: string[] = [];
    const errors: string[] = [];
    const year = new Date().getUTCFullYear();
    const existing = (
      await db()
        .prepare(
          'SELECT id,series_id,edition_year,acronym FROM conferences ORDER BY id',
        )
        .all<{
          id: number;
          series_id: number | null;
          edition_year: number;
          acronym: string;
        }>()
    ).results;
    const pending: D1PreparedStatement[] = [];
    for (const item of parseCcf(source.text)) {
      const series =
        byDblp.get(canonicalKey(item.dblp || '')) ||
        byName.get(canonicalKey(item.title));
      if (!series) {
        unmatched.push(item.title);
        continue;
      }
      matchedIds.add(series.id);
      for (const conf of item.confs || []) {
        if (conf.year < year - 1 || conf.year > year + 2 || !conf.id) continue;
        const position = visited++;
        if (position < cursor || position >= cursor + 100) continue;
        try {
          let c: { id: number } | null | undefined = existing.find(
            (row) =>
              row.series_id === series.id && row.edition_year === conf.year,
          );
          if (!c) {
            c = existing.find(
              (row) =>
                row.series_id === null &&
                row.edition_year === conf.year &&
                row.acronym?.toLowerCase() ===
                  (series.acronym + ' ' + conf.year).toLowerCase(),
            );
            if (c)
              await db()
                .prepare('UPDATE conferences SET series_id=? WHERE id=?')
                .bind(series.id, c.id)
                .run();
          }
          if (!c)
            c = await db()
              .prepare(
                "INSERT INTO conferences(series_id,name,acronym,edition_year,country_code,format,status) VALUES (?,?,?,?, 'ZZ','UNKNOWN','DRAFT') RETURNING id",
              )
              .bind(
                series.id,
                series.name,
                series.acronym + ' ' + conf.year,
                conf.year,
              )
              .first<{ id: number }>();
          if (!c) throw new Error('학회 저장 실패');
          if (!existing.some((row) => row.id === c!.id))
            existing.push({
              id: c.id,
              series_id: series.id,
              edition_year: conf.year,
              acronym: series.acronym + ' ' + conf.year,
            });
          const snapshot = ccfSnapshot(item, conf);
          const key = 'ccf:' + conf.id;
          pending.push(
            db()
              .prepare(
                "INSERT INTO schedule_feeds(source_key,conference_id,kind,url,payload,content_hash,last_checked_at,last_success_at,status) VALUES (?,?,'CCF',?,?,?,?,?,'READY') ON CONFLICT(source_key) DO UPDATE SET payload=excluded.payload,content_hash=excluded.content_hash,last_checked_at=excluded.last_checked_at,last_success_at=excluded.last_success_at,status='READY'",
              )
              .bind(
                key,
                c.id,
                CCF_URL,
                JSON.stringify(snapshot),
                await hashText(JSON.stringify(snapshot)),
                new Date().toISOString(),
                new Date().toISOString(),
              ),
          );
          // Explicit admin selection controls paid Gemini work. Suggested URLs are not auto-enabled.
          try {
            safeUrl(conf.link);
            pending.push(
              db()
                .prepare(
                  "INSERT OR IGNORE INTO schedule_feeds(source_key,conference_id,kind,url,enabled) VALUES (?,?,'OFFICIAL',?,0)",
                )
                .bind('official:' + c.id, c.id, conf.link),
            );
          } catch {
            snapshot.warnings.push('공식 HTTPS URL 수동 지정 필요');
          }
          editions++;
          scheduleCount += snapshot.milestones.length;
        } catch (cause) {
          errors.push(
            conf.id +
              ': ' +
              (cause instanceof Error ? cause.message : '저장 실패'),
          );
        }
      }
    }
    for (let index = 0; index < pending.length; index += 50)
      await db().batch(pending.slice(index, index + 50));
    const nextCursor = visited > cursor + 100 ? cursor + 100 : null;
    const result = {
      next_cursor: nextCursor,
      matched_series: matchedIds.size,
      catalog_without_ccf: catalog
        .filter((row) => !matchedIds.has(row.id))
        .map((row) => row.acronym),
      editions,
      schedules: scheduleCount,
      catalog_series: catalog.length,
      unmatched,
      errors,
      policy: 'DRAFT_ONLY',
      year_from: year - 1,
      year_to: year + 2,
    };
    await storeSnapshot(feed.id, result, hash);
    await finish(
      feed.id,
      errors.length || nextCursor ? 'PARTIAL' : 'SUCCESS',
      nextCursor ? 0 : 24,
    );
    return result;
  } catch (cause) {
    await finish(
      feed.id,
      'FAILED',
      6,
      cause instanceof Error ? cause.message : '수집 실패',
    );
    throw cause;
  }
}

async function allowedByRobots(url: string) {
  const parsed = new URL(url);
  const response = await fetch(new URL('/robots.txt', parsed), {
    redirect: 'manual',
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return;
  if (!response.ok) throw new Error('robots.txt 정책을 확인할 수 없습니다.');
  const rules = await response.text();
  let wildcard = false;
  for (const raw of rules.split('\n')) {
    const line = raw.split('#')[0].trim();
    if (/^user-agent:/i.test(line))
      wildcard = /^(\*|ConferenceTracker)$/i.test(line.slice(11).trim());
    if (wildcard && /^disallow:/i.test(line)) {
      const path = line.slice(9).trim();
      if (path && parsed.pathname.startsWith(path.replace(/\*.*$/, '')))
        throw new Error('robots.txt에서 수집을 허용하지 않습니다.');
    }
  }
}
export async function collectOfficial(feedId: number) {
  const feed = await db()
    .prepare("SELECT * FROM schedule_feeds WHERE id=? AND kind='OFFICIAL'")
    .bind(feedId)
    .first<Feed>();
  if (!feed || !feed.conference_id)
    throw new Error('공식 페이지 수집 설정을 찾을 수 없습니다.');
  if (!env.GEMINI_API_KEY)
    throw new Error('서버에 GEMINI_API_KEY가 설정되지 않았습니다.');
  const conference = await db()
    .prepare('SELECT name,acronym,edition_year FROM conferences WHERE id=?')
    .bind(feed.conference_id)
    .first<{ name: string; acronym: string; edition_year: number }>();
  if (!conference?.edition_year)
    throw new Error('학회 개최 연도가 필요합니다.');
  await lock(feed.id);
  try {
    await allowedByRobots(safeUrl(feed.url));
    const home = await fetchText(feed.url);
    const page = pageText(home.text, home.url);
    const documents = [{ url: home.url, text: page.text }];
    for (const link of page.links) {
      if (link === home.url) continue;
      try {
        await allowedByRobots(link);
        const child = await fetchText(link);
        documents.push({
          url: child.url,
          text: pageText(child.text, child.url).text,
        });
      } catch {
        /* Main page still usable; warnings added below if extraction is empty. */
      }
    }
    const hash = await hashText(JSON.stringify(documents));
    if (feed.content_hash === hash) {
      await finish(feed.id, 'UNCHANGED', 72);
      return { unchanged: true };
    }
    const snapshot = await extractOfficial(
      env.GEMINI_API_KEY,
      env.GEMINI_MODEL || 'gemini-3.6-flash',
      conference.acronym + ' · ' + conference.name,
      conference.edition_year,
      documents,
    );
    snapshot.official_url = home.url;
    if (!snapshot.milestones.length)
      snapshot.warnings.push(
        '확인 가능한 일정이 없습니다. Important Dates 페이지를 직접 지정하세요.',
      );
    await storeSnapshot(feed.id, snapshot, hash);
    await finish(feed.id, snapshot.milestones.length ? 'READY' : 'EMPTY', 72);
    return snapshot;
  } catch (cause) {
    await finish(
      feed.id,
      'FAILED',
      24,
      cause instanceof Error ? cause.message : '공식 일정 추출 실패',
    );
    throw cause;
  }
}

export async function collectDue() {
  const results: Array<{ id: number | string; ok: boolean; message?: string }> =
    [];
  const ccf = await db()
    .prepare(
      "SELECT id FROM schedule_feeds WHERE source_key='ccf:all' AND (next_check_at IS NULL OR next_check_at <= ?)",
    )
    .bind(new Date().toISOString())
    .first();
  if (ccf) {
    try {
      await syncCcf();
      results.push({ id: 'CCF', ok: true });
    } catch {
      results.push({ id: 'CCF', ok: false });
    }
  }
  // At most three paid page extractions per invocation; enable targets explicitly in Admin.
  const due = (
    await db()
      .prepare(
        "SELECT f.id FROM schedule_feeds f LEFT JOIN pins p ON p.conference_id=f.conference_id WHERE f.kind='OFFICIAL' AND f.enabled=1 AND (f.next_check_at IS NULL OR f.next_check_at<=?) AND (f.lease_until IS NULL OR f.lease_until<?) GROUP BY f.id ORDER BY COUNT(p.user_id) DESC,COALESCE(f.next_check_at,'') LIMIT 3",
      )
      .bind(new Date().toISOString(), new Date().toISOString())
      .all<{ id: number }>()
  ).results;
  for (const feed of due) {
    try {
      await collectOfficial(feed.id);
      results.push({ id: feed.id, ok: true });
    } catch (cause) {
      results.push({
        id: feed.id,
        ok: false,
        message: cause instanceof Error ? cause.message : '실패',
      });
    }
  }
  return results;
}
