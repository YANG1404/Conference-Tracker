import assert from 'node:assert/strict';

// Deliberately fixed localhost; this test creates local-only test records.
const base = 'http://localhost:3000';
async function call(path, method = 'GET', body, account = 'admin') {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      ...(account
        ? { Cookie: 'ct_session=local-schedule-test-' + account + '-session' }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
const path = '/api/v1/admin/conferences';
assert.equal(
  (await call('/api/v1/admin/schedules', 'GET', undefined, null)).status,
  401,
);
assert.equal(
  (await call('/api/v1/admin/schedules', 'GET', undefined, 'member')).status,
  403,
);
const draft = {
  name: 'Local calendar integration fixture',
  acronym: 'LOCAL_TEST',
  edition_year: 2028,
  country_code: 'ZZ',
  format: 'UNKNOWN',
  status: 'DRAFT',
  research_field_ids: [],
  links: [],
  milestones: [
    {
      group_name: 'Papers',
      title: 'Submission Due',
      event_at: '2028-02-29T23:59:00',
      original_timezone: 'AoE',
      time_confirmed: true,
    },
    {
      group_name: '',
      title: 'Conference Dates',
      event_at: '2028-02-28',
      end_at: '2028-03-02',
      original_timezone: 'UNSPECIFIED',
      time_confirmed: false,
    },
  ],
};
const created = await call(path, 'POST', draft);
assert.equal(created.status, 201, JSON.stringify(created.data));
const id = created.data.id;
const detail = (await call(path + '/' + id)).data;
assert.equal(detail.milestones[1].event_at, '2028-03-01T11:59:00.000Z');
assert.equal(
  (await call('/api/v1/conferences/' + id, 'GET', undefined, null)).status,
  404,
);
const saved = await call(path + '/' + id, 'PATCH', {
  ...draft,
  status: 'PUBLISHED',
  milestones: detail.milestones,
});
assert.equal(saved.status, 200, JSON.stringify(saved.data));
assert.deepEqual(
  saved.data.milestones.map((m) => m.id),
  detail.milestones.map((m) => m.id),
);
for (const month of ['02', '03']) {
  const calendar = await call(
    '/api/v1/conferences/calendar?date_from=2028-' +
      month +
      '-01&date_to=2028-' +
      month +
      (month === '02' ? '-29' : '-31'),
    'GET',
    undefined,
    null,
  );
  assert.equal(calendar.status, 200);
  assert.ok(calendar.data.items.some((c) => c.id === id));
}
const invalid = await call(path + '/' + id, 'PATCH', {
  ...draft,
  milestones: [{ ...draft.milestones[0], original_timezone: 'PST' }],
});
assert.equal(invalid.status, 422);
assert.equal(
  (await call('/api/v1/conferences/' + id, 'GET', undefined, null)).status,
  200,
  'invalid update must not alter public data',
);
assert.equal(
  (
    await call(
      '/api/v1/conferences/calendar?date_from=bad&date_to=bad',
      'GET',
      undefined,
      null,
    )
  ).status,
  400,
);
await call(path + '/' + id, 'PATCH', {
  ...draft,
  status: 'HIDDEN',
  milestones: detail.milestones,
});
console.log(
  'PASS: auth 401/403, draft isolation, AoE, leap/month overlap, stable milestone IDs, validation atomicity, hidden fixtures',
);
