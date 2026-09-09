import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  displayDay,
  normalizeScheduleDate,
  dayDifference,
  monthGrid,
  overlaps,
  editDate,
} from '../lib/schedule-time';
import {
  canonicalKey,
  ccfSnapshot,
  safeUrl,
  validateExtraction,
  pageText,
} from '../lib/schedule-collectors';

void test('AoE is UTC-12, displayed the following day in KST', () => {
  const utc = normalizeScheduleDate('2026-09-10T23:59:00', 'AoE', true);
  assert.equal(utc, '2026-09-11T11:59:00.000Z');
  assert.equal(displayDay(utc), '2026-09-11');
  assert.equal(editDate(utc, 'AoE', true), '2026-09-10T23:59');
});
void test('date-only remains on original date and rejects invalid dates', () => {
  assert.equal(displayDay('2026-09-10', false), '2026-09-10');
  assert.throws(() => normalizeScheduleDate('2026-02-30', 'AoE', false));
  assert.throws(() => normalizeScheduleDate('2026-09-10T23:59', 'PST', true));
});
void test('IANA zones, DST gaps and negative D-Day', () => {
  assert.equal(
    normalizeScheduleDate('2026-07-01T12:00', 'America/New_York', true),
    '2026-07-01T16:00:00.000Z',
  );
  assert.throws(() =>
    normalizeScheduleDate('2026-03-08T02:30', 'America/New_York', true),
  );
  assert.equal(
    dayDifference('2026-09-06', false, new Date('2026-09-09T01:00:00Z')),
    -3,
  );
});
void test('month lengths, leap years, year boundary, six-week month', () => {
  assert.equal(monthGrid(2028, 2).filter((x) => x.valid).length, 29);
  assert.equal(monthGrid(2027, 2).filter((x) => x.valid).length, 28);
  assert.equal(monthGrid(2026, 8).length, 42);
  assert.equal(monthGrid(2027, 1).find((x) => x.valid)?.date, '2027-01-01');
});
void test('interval crossing month boundaries is visible in both months', () => {
  assert.equal(
    overlaps(
      { event_at: '2026-09-29', end_at: '2026-10-03', time_confirmed: false },
      '2026-10-01',
      '2026-10-31',
    ),
    true,
  );
  assert.equal(
    overlaps(
      { event_at: '2026-09-10T23:59:00Z', time_confirmed: true },
      '2026-09-11',
      '2026-09-11',
    ),
    true,
  );
});
void test('CCF keeps source, rounds, unknown dates without guessing', () => {
  const snapshot = ccfSnapshot(
    { title: 'CHI' },
    {
      id: 'chi27',
      year: 2027,
      link: 'https://chi2027.acm.org/',
      timezone: 'UTC-12',
      timeline: [{ deadline: '2026-09-10 23:59:59', abstract_deadline: 'TBD' }],
    },
  );
  assert.equal(snapshot.milestones.length, 1);
  assert.equal(snapshot.milestones[0].event_at, '2026-09-11T11:59:59.000Z');
  assert.equal(canonicalKey('conf/chi'), 'chi');
});
void test('LLM evidence must belong to provided document, unknown dates omitted', () => {
  const docs = [
    {
      url: 'https://chi2027.acm.org/',
      text: 'Papers Submission Due September 10, 2026. All deadlines AoE.',
    },
  ];
  const row = {
    group_name: 'Papers',
    title: 'Submission Due',
    event_at: '2026-09-10',
    time_confirmed: false,
    source_url: docs[0].url,
    evidence: 'Submission Due September 10, 2026.',
    timezone: null,
  };
  assert.equal(validateExtraction([row], docs, 2027).milestones.length, 1);
  assert.equal(
    validateExtraction([{ ...row, evidence: 'invented evidence' }], docs, 2027)
      .milestones.length,
    0,
  );
  assert.equal(
    validateExtraction([{ ...row, event_at: null }], docs, 2027).milestones
      .length,
    0,
  );
  assert.equal(
    validateExtraction(
      [
        {
          ...row,
          time_confirmed: true,
          event_at: '2026-09-10T23:59',
          timezone: 'AoE',
        },
      ],
      docs,
      2027,
    ).milestones.length,
    0,
  );
});
void test('HTML keeps schedule rows, rejects unsafe URLs', () => {
  assert.match(
    pageText(
      '<body><h2>Papers</h2><table><tr><td>September 10</td><td>Submission Due</td></tr></table><script>evil()</script></body>',
      'https://chi2027.acm.org/',
    ).text,
    /September 10.*Submission Due/,
  );
  for (const url of [
    'http://example.com',
    'https://127.0.0.1/',
    'https://[::1]/',
    'https://x.internal/',
    'https://127.0.0.1.nip.io/',
  ])
    assert.throws(() => safeUrl(url));
});
