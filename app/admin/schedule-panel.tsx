'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { editDate } from '@/lib/schedule-time';
import type { MilestoneDraft } from './workspace';
import type { Snapshot } from '@/lib/schedule-collectors';

type Feed = {
  id: number;
  conference_id: number | null;
  kind: string;
  url: string;
  enabled: number;
  status: string;
  acronym: string;
  last_checked_at: string | null;
  last_success_at: string | null;
  error_message: string | null;
  payload: Snapshot | null;
};
async function api(body: Record<string, unknown>) {
  const response = await fetch('/api/v1/admin/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as {
    message?: string;
    unchanged?: boolean;
    next_cursor?: number | null;
  };
  if (!response.ok) throw new Error(data.message || '수집 요청 실패');
  return data;
}
function useFeeds(conferenceId?: number) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    const response = await fetch(
      '/api/v1/admin/schedules' +
        (conferenceId ? '?conference_id=' + conferenceId : ''),
    );
    if (!response.ok) throw new Error('수집 상태 조회 실패');
    setFeeds(((await response.json()) as { items: Feed[] }).items);
  }, [conferenceId]);
  useEffect(() => {
    const timer = setTimeout(
      () => void refresh().catch((e) => setMessage(e.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, [refresh]);
  async function run(
    body: Record<string, unknown>,
    done?: () => void | Promise<void>,
  ) {
    setBusy(true);
    setMessage(
      '수집 중입니다. 공식 페이지 추출에는 잠시 시간이 걸릴 수 있습니다.',
    );
    try {
      let result = await api(body);
      while (body.action === 'ccf' && result.next_cursor)
        result = await api(body);
      await refresh();
      await done?.();
      setMessage(
        body.action === 'configure'
          ? '수집 설정을 저장했습니다.'
          : result.unchanged
            ? '원문 변경이 없어 Gemini 호출을 생략했습니다.'
            : '수집 완료. 결과는 편집 화면에서 확인 후 저장·공개하세요.',
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '수집 실패');
    } finally {
      setBusy(false);
    }
  }
  return { feeds, busy, message, run };
}
export function ScheduleCollectionPanel({
  onChanged,
}: {
  onChanged: () => Promise<void>;
}) {
  const { feeds, busy, message, run } = useFeeds();
  const [search, setSearch] = useState('');
  const official = feeds.filter(
    (f) =>
      f.kind === 'OFFICIAL' &&
      (f.acronym || '').toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="rounded-2xl border bg-white p-5 space-y-4">
      <h2 className="text-xl font-bold text-[#2F6B3F]">외부 일정 수집</h2>
      <p className="text-sm text-stone-600">
        Gist 카탈로그에 포함된 학회만 CCF-Deadlines와 연결합니다. 기본 마감일은
        CCF, 추가 공식 일정은 Gemini로 추출합니다. 수집 결과는 공개 데이터와
        분리되며 자동 공개되지 않습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={() => run({ action: 'ccf' }, onChanged)}
        >
          CCF 기본 일정 동기화
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => run({ action: 'due' }, onChanged)}
        >
          갱신 예정 일정 수집
        </Button>
      </div>
      <p className="text-xs text-stone-500">
        자동 수집을 켠 공식 페이지만 주기적 추출 대상으로 사용합니다. 한 실행당
        최대 3개, 원문이 같으면 Gemini 호출을 생략합니다. 마감 정보는 관리자
        확인 후 공개해야 합니다.
      </p>
      {message && (
        <output className="rounded-lg bg-[#FFF6C0] p-3 text-sm">
          {message}
        </output>
      )}
      {feeds
        .filter((f) => f.kind === 'CCF_INDEX')
        .map((feed) => (
          <div key={feed.id} className="text-sm bg-stone-50 p-3 rounded-lg">
            CCF 동기화: {feed.status} · 최근 확인{' '}
            {feed.last_checked_at
              ? new Date(feed.last_checked_at).toLocaleString('ko-KR')
              : '없음'}
            {feed.error_message && (
              <p className="text-red-700">{feed.error_message}</p>
            )}
            {feed.payload && (
              <details>
                <summary>카탈로그 매칭·수집 결과</summary>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">
                  {JSON.stringify(feed.payload, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      <Input
        aria-label="수집 대상 학회 검색"
        placeholder="수집 대상 학회 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-[600px] overflow-auto divide-y">
        {official.map((feed) => (
          <div key={feed.id} className="py-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <strong>{feed.acronym}</strong>
              <p className="text-xs break-all text-stone-500">{feed.url}</p>
              <p className="text-xs">
                {feed.status} ·{' '}
                {feed.last_success_at
                  ? new Date(feed.last_success_at).toLocaleString('ko-KR')
                  : '아직 수집하지 않음'}
              </p>
              {feed.error_message && (
                <p className="text-xs text-red-700">{feed.error_message}</p>
              )}
            </div>
            <label className="text-xs flex gap-2">
              <input
                type="checkbox"
                checked={Boolean(feed.enabled)}
                disabled={busy}
                onChange={(e) =>
                  run({
                    action: 'configure',
                    conference_id: feed.conference_id,
                    url: feed.url,
                    enabled: e.target.checked,
                  })
                }
              />
              자동 수집
            </label>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => run({ action: 'official', feed_id: feed.id })}
            >
              공식 일정 수집
            </Button>
          </div>
        ))}
        {!official.length && (
          <p className="py-6 text-sm text-stone-500">
            대상이 없습니다. 먼저 CCF 동기화를 실행하거나 학회 편집 화면에서
            공식 페이지를 지정하세요.
          </p>
        )}
      </div>
    </section>
  );
}

export function ScheduleImportEditor({
  conferenceId,
  milestones,
  onChange,
}: {
  conferenceId: number;
  milestones: MilestoneDraft[];
  onChange: (items: MilestoneDraft[]) => void;
}) {
  const { feeds, busy, message, run } = useFeeds(conferenceId);
  const [url, setUrl] = useState('');
  const official = feeds.find((f) => f.kind === 'OFFICIAL');
  const [target, setTarget] = useState<Record<string, string>>({});
  function apply(
    item: Snapshot['milestones'][number],
    targetIndex: number | null,
  ) {
    const row: MilestoneDraft = {
      ...item,
      event_at: editDate(
        item.event_at,
        item.original_timezone,
        item.time_confirmed,
      ),
      end_at: item.end_at
        ? editDate(item.end_at, item.original_timezone, item.time_confirmed)
        : null,
    };
    if (targetIndex !== null)
      onChange(
        milestones.map((old, i) =>
          i === targetIndex ? { ...row, id: old.id } : old,
        ),
      );
    else onChange([...milestones, row]);
  }
  return (
    <section className="rounded-xl border border-[#7FB77E] bg-[#FFFDF0] p-4 space-y-3">
      <h3 className="font-bold text-[#2F6B3F]">수집 원문 및 편집본 반영</h3>
      <p className="text-xs text-stone-600">
        자동 수집 결과는 공개 데이터에 먼저 반영됩니다. 아래 원문과 근거를
        확인한 뒤 잘못된 항목만 수정하고 하단 저장 버튼을 눌러 보정하세요.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          className="flex-1 min-w-48"
          aria-label="공식 일정 페이지"
          placeholder={official?.url || 'https://학회사이트/important-dates'}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy || !url}
          onClick={() =>
            run({
              action: 'configure',
              conference_id: conferenceId,
              url,
              enabled: Boolean(official?.enabled),
            })
          }
        >
          URL 저장
        </Button>
        {official && (
          <Button
            type="button"
            disabled={busy}
            onClick={() => run({ action: 'official', feed_id: official.id })}
          >
            Gemini 일정 추출
          </Button>
        )}
      </div>
      {message && <output className="text-sm">{message}</output>}
      {feeds
        .filter((f) => f.payload?.milestones)
        .map((feed) => (
          <details key={feed.id} open className="rounded-lg bg-white p-3">
            <summary className="font-bold text-sm">
              {feed.kind === 'CCF' ? 'CCF 기본 일정' : '공식 페이지 추출'} ·{' '}
              {feed.payload!.milestones.length}개
            </summary>
            {feed.payload!.warnings?.map((warning, i) => (
              <p key={i} className="mt-1 text-xs text-amber-800">
                {warning}
              </p>
            ))}
            {feed.payload!.place && (
              <p className="text-xs mt-2">
                원본 개최지: {feed.payload!.place} · 기간:{' '}
                {feed.payload!.dates || '미정'} (기본 정보에서 확인 후 입력)
              </p>
            )}
            {feed.payload!.milestones.map((item, index) => {
              const key = feed.id + ':' + index;
              const exact = milestones.findIndex(
                (m) => m.external_key === item.external_key,
              );
              const value = target[key] ?? (exact >= 0 ? String(exact) : 'new');
              return (
                <div key={key} className="border-t mt-3 pt-3 space-y-2 text-sm">
                  <strong>
                    {[item.group_name, item.title].filter(Boolean).join(' – ')}
                  </strong>
                  <p>
                    {editDate(
                      item.event_at,
                      item.original_timezone,
                      item.time_confirmed,
                    )}{' '}
                    {item.end_at
                      ? ' ~ ' +
                        editDate(
                          item.end_at,
                          item.original_timezone,
                          item.time_confirmed,
                        )
                      : ''}{' '}
                    · {item.original_timezone}{' '}
                    {!item.time_confirmed && '· 시각 미정'}
                  </p>
                  <details className="text-xs text-stone-600">
                    <summary>출처와 원문 근거</summary>
                    <a
                      className="underline"
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      원문 열기
                    </a>
                    <p className="whitespace-pre-wrap mt-1">
                      {item.source_text}
                    </p>
                  </details>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="max-w-full rounded border p-2 text-xs"
                      aria-label="편집본 반영 대상"
                      value={value}
                      onChange={(e) =>
                        setTarget((old) => ({ ...old, [key]: e.target.value }))
                      }
                    >
                      <option value="new">새 일정으로 추가</option>
                      {milestones.map((m, i) => (
                        <option key={i} value={i}>
                          {[m.group_name, m.title].filter(Boolean).join(' – ')}{' '}
                          교체
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        apply(item, value === 'new' ? null : Number(value))
                      }
                    >
                      {value === 'new' ? '편집본에 추가' : '선택 일정 교체'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </details>
        ))}
    </section>
  );
}
