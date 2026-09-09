import { env } from 'cloudflare:workers';

export const CATALOG_SOURCE_URL =
  'https://gist.githubusercontent.com/Pusnow/6eb933355b5cb8d31ef1abcb3c3e1206/raw';

type CatalogRow = {
  sourceRow: number;
  acronym: string;
  canonicalAcronym: string;
  canonicalName: string;
  name: string;
  dblpKey: string;
  ksiGrade: string | null;
  bk21If: string | null;
  kaistRecognized: boolean;
  snuRecognized: boolean;
  postechGrade: string | null;
  normalizedScore: string | null;
  trackName: string | null;
  presentationType: string | null;
  rawRow: string;
  seriesKey: string;
};

function db(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable.');
  return env.DB;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function clean(value: string | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

function parseCatalog(text: string): CatalogRow[] {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const parsed = lines.slice(1).flatMap((rawRow, index) => {
    if (!rawRow.trim()) return [];
    const cells = parseCsvLine(rawRow);
    if (cells.length < 9 || !cells[0] || !cells[7] || !cells[8]) return [];
    const presentation = cells[0].match(/\s*\((oral|poster|spotlight)\)\s*$/i);
    const findings = cells[0].match(/^(.*?)\s+Findings$/i);
    const canonicalAcronym = (findings?.[1] ?? cells[0])
      .replace(/\s*\((oral|poster|spotlight)\)\s*$/i, '')
      .trim();
    return [
      {
        sourceRow: index + 2,
        acronym: cells[0],
        canonicalAcronym,
        canonicalName: cells[7]
          .replace(/\s*\((oral|poster|spotlight)\)\s*$/i, '')
          .trim(),
        name: cells[7],
        dblpKey: cells[8],
        ksiGrade: clean(cells[1]),
        bk21If: clean(cells[2]),
        kaistRecognized: cells[3]?.toUpperCase() === 'O',
        snuRecognized: cells[4]?.toUpperCase() === 'O',
        postechGrade: clean(cells[5]),
        normalizedScore: clean(cells[6]),
        trackName: findings ? 'Findings' : null,
        presentationType: presentation?.[1]?.toLowerCase() ?? null,
        rawRow,
        seriesKey: '',
      },
    ];
  });

  const primaryKeys = new Map<string, string>();
  for (const row of parsed) {
    if (!row.trackName && !row.presentationType) {
      primaryKeys.set(
        row.canonicalAcronym.toLowerCase(),
        `dblp:${row.dblpKey.toLowerCase()}`,
      );
    }
  }
  for (const row of parsed) {
    row.seriesKey =
      primaryKeys.get(row.canonicalAcronym.toLowerCase()) ??
      `dblp:${row.dblpKey.toLowerCase()}`;
  }
  return parsed;
}

async function runBatches(statements: D1PreparedStatement[]) {
  for (let index = 0; index < statements.length; index += 50) {
    await db().batch(statements.slice(index, index + 50));
  }
}

export async function syncCatalog() {
  await db()
    .prepare(`
      INSERT INTO catalog_sync_state (id, source_url, status, row_count)
      VALUES (1, ?, 'RUNNING', 0)
      ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, status = 'RUNNING', error_message = NULL
    `)
    .bind(CATALOG_SOURCE_URL)
    .run();

  try {
    const response = await fetch(CATALOG_SOURCE_URL, {
      headers: { Accept: 'text/csv,text/plain;q=0.9' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`CSV 다운로드 실패 (${response.status})`);
    const rows = parseCatalog(await response.text());
    if (rows.length < 200)
      throw new Error('CSV 행 수가 예상보다 적어 동기화를 중단했습니다.');

    const seriesByKey = new Map<string, CatalogRow>();
    for (const row of rows) {
      const current = seriesByKey.get(row.seriesKey);
      if (!current || (current.presentationType && !row.presentationType)) {
        seriesByKey.set(row.seriesKey, row);
      }
    }

    await db().batch([
      db().prepare('UPDATE conference_catalog_entries SET is_active = 0'),
      db().prepare('UPDATE conference_series SET is_active = 0'),
    ]);

    await runBatches(
      [...seriesByKey.values()].map((row) =>
        db()
          .prepare(`
            INSERT INTO conference_series (catalog_key, acronym, name, dblp_key, is_active)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT(catalog_key) DO UPDATE SET
              acronym = excluded.acronym,
              name = excluded.name,
              dblp_key = excluded.dblp_key,
              is_active = 1,
              updated_at = CURRENT_TIMESTAMP
          `)
          .bind(
            row.seriesKey,
            row.canonicalAcronym,
            row.canonicalName,
            row.dblpKey,
          ),
      ),
    );

    const series = await db()
      .prepare('SELECT id, catalog_key FROM conference_series')
      .all<{ id: number; catalog_key: string }>();
    const seriesIds = new Map(
      series.results.map((item) => [item.catalog_key, item.id]),
    );

    await runBatches(
      rows.map((row) =>
        db()
          .prepare(`
            INSERT INTO conference_catalog_entries (
              series_id, source_row, acronym, canonical_acronym, name, dblp_key,
              ksi_grade, bk21_if, kaist_recognized, snu_recognized, postech_grade,
              normalized_score, track_name, presentation_type, source_url, raw_row,
              is_active, synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(source_row) DO UPDATE SET
              series_id = excluded.series_id,
              acronym = excluded.acronym,
              canonical_acronym = excluded.canonical_acronym,
              name = excluded.name,
              dblp_key = excluded.dblp_key,
              ksi_grade = excluded.ksi_grade,
              bk21_if = excluded.bk21_if,
              kaist_recognized = excluded.kaist_recognized,
              snu_recognized = excluded.snu_recognized,
              postech_grade = excluded.postech_grade,
              normalized_score = excluded.normalized_score,
              track_name = excluded.track_name,
              presentation_type = excluded.presentation_type,
              source_url = excluded.source_url,
              raw_row = excluded.raw_row,
              is_active = 1,
              synced_at = CURRENT_TIMESTAMP
          `)
          .bind(
            seriesIds.get(row.seriesKey) ?? null,
            row.sourceRow,
            row.acronym,
            row.canonicalAcronym,
            row.name,
            row.dblpKey,
            row.ksiGrade,
            row.bk21If,
            row.kaistRecognized ? 1 : 0,
            row.snuRecognized ? 1 : 0,
            row.postechGrade,
            row.normalizedScore,
            row.trackName,
            row.presentationType,
            CATALOG_SOURCE_URL,
            row.rawRow,
          ),
      ),
    );

    await db()
      .prepare(`
        UPDATE conferences
        SET series_id = (
          SELECT s.id FROM conference_series s
          WHERE lower(s.acronym) = lower(conferences.acronym)
          LIMIT 1
        )
        WHERE series_id IS NULL AND acronym IS NOT NULL
      `)
      .run();
    await db()
      .prepare(`
        UPDATE catalog_sync_state
        SET status = 'SUCCEEDED', row_count = ?, last_synced_at = CURRENT_TIMESTAMP, error_message = NULL
        WHERE id = 1
      `)
      .bind(rows.length)
      .run();

    return {
      row_count: rows.length,
      series_count: seriesByKey.size,
      merged_row_count: rows.length - seriesByKey.size,
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '동기화 실패';
    await db()
      .prepare(`
        UPDATE catalog_sync_state
        SET status = 'FAILED', error_message = ?, last_synced_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `)
      .bind(message)
      .run();
    throw cause;
  }
}

export async function getCatalogStatus() {
  const [state, rawRows, activeSeries] = await Promise.all([
    db()
      .prepare('SELECT * FROM catalog_sync_state WHERE id = 1')
      .first<Record<string, unknown>>(),
    db()
      .prepare(
        'SELECT COUNT(*) AS count FROM conference_catalog_entries WHERE is_active = 1',
      )
      .first<{ count: number }>(),
    db()
      .prepare(
        'SELECT COUNT(*) AS count FROM conference_series WHERE is_active = 1',
      )
      .first<{ count: number }>(),
  ]);
  return {
    status: state?.status ?? 'NOT_SYNCED',
    source_url: state?.source_url ?? CATALOG_SOURCE_URL,
    row_count: rawRows?.count ?? 0,
    series_count: activeSeries?.count ?? 0,
    last_synced_at: state?.last_synced_at ?? null,
    error_message: state?.error_message ?? null,
  };
}

export async function listCatalog(input: {
  query?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const query = `%${(input.query ?? '').trim().toLowerCase()}%`;
  const where = input.query?.trim()
    ? 'WHERE s.is_active = 1 AND (lower(s.acronym) LIKE ? OR lower(s.name) LIKE ? OR lower(s.dblp_key) LIKE ?)'
    : 'WHERE s.is_active = 1';
  const bindings = input.query?.trim() ? [query, query, query] : [];
  const [items, count] = await Promise.all([
    db()
      .prepare(`
        SELECT s.id, s.acronym, s.name, s.dblp_key,
          COUNT(e.id) AS source_row_count,
          GROUP_CONCAT(DISTINCT e.presentation_type) AS presentation_types,
          GROUP_CONCAT(DISTINCT e.track_name) AS tracks,
          MAX(CAST(e.normalized_score AS REAL)) AS normalized_score,
          MAX(e.ksi_grade) AS ksi_grade,
          MAX(e.kaist_recognized) AS kaist_recognized,
          MAX(e.snu_recognized) AS snu_recognized,
          MAX(e.postech_grade) AS postech_grade
        FROM conference_series s
        LEFT JOIN conference_catalog_entries e ON e.series_id = s.id AND e.is_active = 1
        ${where}
        GROUP BY s.id
        ORDER BY s.acronym COLLATE NOCASE
        LIMIT ? OFFSET ?
      `)
      .bind(...bindings, limit, offset)
      .all<Record<string, unknown>>(),
    db()
      .prepare(`SELECT COUNT(*) AS count FROM conference_series s ${where}`)
      .bind(...bindings)
      .first<{ count: number }>(),
  ]);
  return { items: items.results, total: count?.count ?? 0, limit, offset };
}
