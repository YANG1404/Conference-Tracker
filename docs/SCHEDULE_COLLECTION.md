# Calendar and schedule collection

## Data ownership

- The Gist catalog defines the included conference series. CCF is a schedule source, not a replacement catalog.
- Original CSV rows and normalized series remain intact.
- CCF synchronization reads the upstream HTTPS aggregate and matches DBLP keys first, then exact normalized acronyms. Unmatched records are reported, not silently added to the catalog.
- Collection covers the previous year through current year + 2. It processes at most 100 editions per request. Reinvoke while `next_cursor` is non-null.
- CCF and Gemini snapshots live in `schedule_feeds`, separate from `milestones`. Existing public records and administrator edits are not overwritten.
- Untouched seed records identified by exact original IDs/timestamps are moved to DRAFT during initial sync. No data or pins are deleted. Administrator-edited KSC is retained.
- Open a conference editor to inspect evidence and add or replace individual schedules. Saving PUBLISHED makes those edits visible; no approval/rejection queue is used.
- Venue/date strings from CCF are shown as source evidence, not automatically guessed country/format values. Unknown values use ZZ/UNKNOWN until edited.

## Detailed official schedules

Specify the official HTTPS Important Dates/CFP URL in the editor. The collector fetches the page and up to two same-origin CFP/date links, respects robots exclusions, caps document size, and validates redirects. It does not bypass access restrictions or execute page instructions.

Gemini preserves official track/group and event names in an array. Missing dates are excluded with warnings. Each accepted row needs a verbatim evidence excerpt. Timed events require timezone evidence. These checks reduce errors but do not establish factual correctness; administrator verification remains necessary.

The primary model is set with GEMINI_MODEL. For temporary HTTP 503 congestion, one fallback attempt uses gemini-3.5-flash-lite. The used model is recorded in the snapshot. Other failures remain visible for retry. The key is server-only and must never be committed.

## Date semantics

- Timed: UTC ISO timestamp + original_timezone, rendered in Asia/Seoul (KST).
- Date-only: YYYY-MM-DD, time_confirmed=false, no invented midnight/deadline time.
- end_at is optional and inclusive for date ranges.
- AoE is UTC-12. 2026-09-10 23:59 AoE = 2026-09-11 20:59 KST.
- Calendar and list use overlapping date ranges, not a fixed month. Month/year selector, previous/next, Today, and URL year/month support 1900–2100.
- Missing data is an empty state, never fake schedule data.

## Scheduling

The Worker exports a scheduled handler, with a six-hour cron in vite.config.ts. CCF resumes incomplete batches at the next tick and refreshes completed imports after 24 hours. Enabled official targets refresh after 72 hours, with at most three targets per invocation, ordered by pin count. Unchanged HTML skips Gemini.

Cron activation depends on the hosting platform applying Worker triggers; a successful deployment alone is not proof that a cron fired. The same job can be called by an external scheduler:

POST /api/v1/admin/schedules
Authorization: Bearer (server-managed SCHEDULE_SYNC_TOKEN)
Content-Type: application/json

Body: {"action":"due"}

Do not place the token in a URL or browser bundle. Monitor last_checked_at, next_check_at, status and error_message in Admin. A target is opt-in to bound paid API usage.

## API and verification

The current calendar/collection contract is available at /api/v1/openapi (OpenAPI 3.1). It supersedes the old calendar response array for this implementation; the response is now {items,date_from,date_to,timezone}.

- npx tsx --test tests/schedules.test.ts
- npx oxlint app lib db worker.ts tests
- npx tsc --noEmit
- npm run build

For local HTTP integration tests only, apply tests/runtime-fixtures.sql to the local D1 database and run node tests/runtime.mjs. Never apply test fixtures remotely. Test conferences are left HIDDEN or DRAFT; no production users or data are used.
