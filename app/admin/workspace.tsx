'use client';

import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CloudDownload,
  Database,
  Globe2,
  Link2,
  ListTree,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import { editDate } from '@/lib/schedule-time';
import {
  ScheduleCollectionPanel,
  ScheduleImportEditor,
} from './schedule-panel';

type AdminConference = {
  id: number;
  name: string;
  acronym: string | null;
  edition_year: number | null;
  description: string | null;
  country_code: string;
  city: string | null;
  venue: string | null;
  format: 'ONSITE' | 'ONLINE' | 'HYBRID' | 'UNKNOWN';
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  milestone_count: number;
  next_milestone_at: string | null;
  research_field_count: number;
};
type ResearchField = {
  id: number;
  acm_ccs_code: string;
  name_ko: string;
  name_en: string;
  depth: number;
};
type SourceSite = {
  id: number;
  name: string;
  base_url: string;
  source_type: 'API' | 'RSS' | 'WEB_PAGE';
  is_active: number;
  last_collected_at: string | null;
};
type Stats = {
  published_conferences: number;
  total_milestones: number;
  active_sources: number;
};
type CatalogStatus = {
  status: string;
  source_url: string;
  row_count: number;
  series_count: number;
  last_synced_at: string | null;
  error_message: string | null;
};
type CatalogItem = {
  id: number;
  acronym: string;
  name: string;
  dblp_key: string;
  source_row_count: number;
  presentation_types: string | null;
  tracks: string | null;
};
export type MilestoneDraft = {
  id?: number;
  end_at?: string | null;
  source_url?: string;
  source_text?: string;
  source_kind?: string;
  external_key?: string;
  group_name: string;
  title: string;
  event_at: string;
  original_timezone: string;
  time_confirmed: boolean;
};
type LinkDraft = {
  type: string;
  label: string;
  url: string;
  is_active: boolean;
};
type ConferenceDraft = {
  id: number | null;
  name: string;
  acronym: string;
  edition_year: string;
  description: string;
  country_code: string;
  city: string;
  venue: string;
  format: 'ONSITE' | 'ONLINE' | 'HYBRID' | 'UNKNOWN';
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  research_field_ids: number[];
  primary_research_field_id: number | null;
  milestones: MilestoneDraft[];
  links: LinkDraft[];
};

const emptyConference = (): ConferenceDraft => ({
  id: null,
  name: '',
  acronym: '',
  edition_year: `${new Date().getFullYear() + 1}`,
  description: '',
  country_code: '',
  city: '',
  venue: '',
  format: 'ONSITE',
  status: 'DRAFT',
  research_field_ids: [],
  primary_research_field_id: null,
  milestones: [],
  links: [],
});

function dDay(value: string | null) {
  if (!value) return '일정 없음';
  const target = Date.parse(value.slice(0, 10));
  const today = new Date();
  const start = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const difference = Math.round((target - start) / 86_400_000);
  if (difference === 0) return 'D-Day';
  return difference > 0 ? `D-${difference}` : `D+${Math.abs(difference)}`;
}
function statusLabel(status: AdminConference['status']) {
  return status === 'PUBLISHED'
    ? '공개'
    : status === 'HIDDEN'
      ? '숨김'
      : '임시 저장';
}

export function AdminWorkspace({ userName }: { userName: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [conferences, setConferences] = useState<AdminConference[]>([]);
  const [sources, setSources] = useState<SourceSite[]>([]);
  const [fields, setFields] = useState<ResearchField[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus | null>(
    null,
  );
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [conferenceDraft, setConferenceDraft] =
    useState<ConferenceDraft | null>(null);
  const [sourceDraft, setSourceDraft] = useState<SourceSite | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    const responses = await Promise.all([
      fetch('/api/v1/admin/overview'),
      fetch('/api/v1/admin/conferences'),
      fetch('/api/v1/admin/source-sites'),
      fetch('/api/v1/research-fields'),
      fetch('/api/v1/admin/catalog/status'),
      fetch('/api/v1/catalog?limit=100'),
    ]);
    if (responses.some((response) => !response.ok)) {
      const denied = responses.some((response) => response.status === 403);
      setErrorMessage(
        denied
          ? '이 계정은 관리자 허용 목록에 없습니다.'
          : '관리 데이터를 불러오지 못했습니다.',
      );
      setLoading(false);
      return;
    }
    const [
      statsData,
      conferencesData,
      sourcesData,
      fieldsData,
      catalogStatusData,
      catalogData,
    ] = (await Promise.all(responses.map((response) => response.json()))) as [
      Stats,
      { items: AdminConference[] },
      { items: SourceSite[] },
      ResearchField[],
      CatalogStatus,
      { items: CatalogItem[] },
    ];
    setStats(statsData);
    setConferences(conferencesData.items);
    setSources(sourcesData.items);
    setFields(fieldsData);
    setCatalogStatus(catalogStatusData);
    setCatalogItems(catalogData.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const visibleConferences = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return conferences.filter((conference) => {
      const matchesKeyword =
        !keyword ||
        conference.name.toLowerCase().includes(keyword) ||
        (conference.acronym ?? '').toLowerCase().includes(keyword);
      return (
        matchesKeyword &&
        (statusFilter === 'ALL' || conference.status === statusFilter)
      );
    });
  }, [conferences, search, statusFilter]);

  async function openEditor(conference?: AdminConference) {
    setErrorMessage('');
    if (!conference) return setConferenceDraft(emptyConference());
    const response = await fetch(`/api/v1/admin/conferences/${conference.id}`);
    if (!response.ok)
      return setErrorMessage('학회 상세 정보를 불러오지 못했습니다.');
    const detail = (await response.json()) as AdminConference & {
      research_fields: Array<{ research_field_id: number; is_primary: number }>;
      milestones: Array<MilestoneDraft>;
      links: Array<LinkDraft>;
    };
    const selectedFields = detail.research_fields.map((field) =>
      Number(field.research_field_id),
    );
    setConferenceDraft({
      id: detail.id,
      name: detail.name,
      acronym: detail.acronym ?? '',
      edition_year: detail.edition_year ? `${detail.edition_year}` : '',
      description: detail.description ?? '',
      country_code: detail.country_code,
      city: detail.city ?? '',
      venue: detail.venue ?? '',
      format: detail.format,
      status: detail.status,
      research_field_ids: selectedFields,
      primary_research_field_id:
        detail.research_fields.find((field) => Boolean(field.is_primary))
          ?.research_field_id ??
        selectedFields[0] ??
        null,
      milestones: detail.milestones.map((item) => ({
        ...item,
        event_at: editDate(
          item.event_at,
          item.original_timezone,
          Boolean(item.time_confirmed),
        ),
        end_at: item.end_at
          ? editDate(
              item.end_at,
              item.original_timezone,
              Boolean(item.time_confirmed),
            )
          : null,
        time_confirmed: Boolean(item.time_confirmed),
      })),
      links: detail.links.map((item) => ({
        ...item,
        is_active: Boolean(item.is_active),
      })),
    });
  }

  function updateDraft<K extends keyof ConferenceDraft>(
    key: K,
    value: ConferenceDraft[K],
  ) {
    setConferenceDraft((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  async function saveConference(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conferenceDraft) return;
    setSaving(true);
    setErrorMessage('');
    const payload = {
      ...conferenceDraft,
      edition_year: conferenceDraft.edition_year
        ? Number(conferenceDraft.edition_year)
        : null,
      acronym: conferenceDraft.acronym || null,
      description: conferenceDraft.description || null,
      city: conferenceDraft.city || null,
      venue: conferenceDraft.venue || null,
      country_code: conferenceDraft.country_code.toUpperCase(),
      milestones: conferenceDraft.milestones.map((item) => ({
        ...item,
        event_at: item.event_at,
      })),
    };
    const response = await fetch(
      conferenceDraft.id
        ? `/api/v1/admin/conferences/${conferenceDraft.id}`
        : '/api/v1/admin/conferences',
      {
        method: conferenceDraft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    setSaving(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        error?: { message?: string };
      } | null;
      return setErrorMessage(
        data?.message ?? data?.error?.message ?? '학회 저장에 실패했습니다.',
      );
    }
    const wasEditing = Boolean(conferenceDraft.id);
    setConferenceDraft(null);
    setMessage(
      wasEditing
        ? '학회 정보와 공식 일정을 수정했습니다.'
        : '새 학회를 등록했습니다.',
    );
    await load();
  }

  async function saveSource(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceDraft) return;
    setSaving(true);
    const isNew = sourceDraft.id === 0;
    const response = await fetch(
      isNew
        ? '/api/v1/admin/source-sites'
        : `/api/v1/admin/source-sites/${sourceDraft.id}`,
      {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sourceDraft,
          is_active: Boolean(sourceDraft.is_active),
        }),
      },
    );
    setSaving(false);
    if (!response.ok) return setErrorMessage('수집 출처 저장에 실패했습니다.');
    setSourceDraft(null);
    setMessage(
      isNew ? '수집 출처를 추가했습니다.' : '수집 출처 설정을 변경했습니다.',
    );
    await load();
  }

  async function toggleSource(source: SourceSite) {
    const response = await fetch(`/api/v1/admin/source-sites/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...source, is_active: !source.is_active }),
    });
    if (!response.ok)
      return setErrorMessage('수집 출처 상태를 변경하지 못했습니다.');
    setMessage(
      `${source.name} 수집을 ${source.is_active ? '중지' : '활성화'}했습니다.`,
    );
    await load();
  }

  async function synchronizeCatalog() {
    setSyncingCatalog(true);
    setMessage('');
    setErrorMessage('');
    const response = await fetch('/api/v1/admin/catalog/sync', {
      method: 'POST',
    });
    setSyncingCatalog(false);
    if (!response.ok) {
      setErrorMessage('Gist CSV 카탈로그 동기화에 실패했습니다.');
      return;
    }
    const result = (await response.json()) as {
      row_count: number;
      series_count: number;
    };
    setMessage(
      `CSV ${result.row_count}개 행을 ${result.series_count}개 학회로 정규화했습니다.`,
    );
    await load();
  }

  return (
    <div className="min-h-screen bg-[#F8F8EC] text-[#203126]">
      <header className="bg-[#2F6B3F] text-white">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center gap-4 px-5 sm:px-8">
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="grid size-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
            aria-label="캘린더로 돌아가기"
          >
            <ArrowLeft />
          </button>
          <div>
            <p className="text-lg font-black tracking-tight">
              Conference Tracker Admin
            </p>
            <p className="text-xs text-white/70">
              학회·공식 일정 및 수집 출처 관리
            </p>
          </div>
          <div className="ml-auto hidden items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm sm:flex">
            <ShieldCheck className="size-4 text-[#F7C85C]" /> {userName}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge className="bg-[#FFF6C0] text-[#6A5117] hover:bg-[#FFF6C0]">
              관리자 전용
            </Badge>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] text-[#183E28]">
              운영 대시보드
            </h1>
            <p className="mt-2 text-sm text-[#68746B]">
              공개할 학회 정보와 학회가 발표한 공식 일정을 관리합니다.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-fit border-[#2F6B3F]/15 bg-white"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} /> 새로고침
          </Button>
        </div>

        {message && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#7FB77E]/30 bg-[#EAF4E3] px-4 py-3 text-sm font-semibold text-[#2F6B3F]">
            <Check className="size-4" /> {message}
            <button
              className="ml-auto"
              onClick={() => setMessage('')}
              aria-label="알림 닫기"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: '공개 학회',
              value: stats?.published_conferences ?? '—',
              icon: Globe2,
              tone: 'bg-[#E5F1DF] text-[#2F6B3F]',
            },
            {
              label: '등록된 공식 일정',
              value: stats?.total_milestones ?? '—',
              icon: CalendarDays,
              tone: 'bg-[#FFF6C0] text-[#795914]',
            },
            {
              label: '활성 수집 출처',
              value: stats?.active_sources ?? '—',
              icon: Database,
              tone: 'bg-[#DDEDDC] text-[#2F6B3F]',
            },
            {
              label: 'CSV 기준 학회',
              value: catalogStatus?.series_count ?? '—',
              icon: ListTree,
              tone: 'bg-[#FDE8A8] text-[#795914]',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#2F6B3F]/10 bg-white p-5 shadow-sm"
            >
              <div
                className={`grid size-10 place-items-center rounded-xl ${item.tone}`}
              >
                <item.icon className="size-5" />
              </div>
              <p className="mt-5 text-3xl font-black">{item.value}</p>
              <p className="mt-1 text-sm font-semibold text-[#6C786F]">
                {item.label}
              </p>
            </div>
          ))}
        </section>

        <Tabs defaultValue="conferences" className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="h-11 w-full justify-start rounded-xl bg-white p-1 shadow-sm sm:w-fit">
              <TabsTrigger value="conferences" className="px-4">
                학회 및 일정
              </TabsTrigger>
              <TabsTrigger value="sources" className="px-4">
                수집 출처
              </TabsTrigger>
              <TabsTrigger value="catalog" className="px-4">
                기준 카탈로그
              </TabsTrigger>
              <TabsTrigger value="schedule-collection">
                일정 자동 수집
              </TabsTrigger>
            </TabsList>
            <Button
              className="w-fit bg-[#F7C85C] font-bold text-[#40320E] hover:bg-[#E8B642]"
              onClick={() => void openEditor()}
            >
              <Plus /> 학회 등록
            </Button>
          </div>

          <TabsContent value="schedule-collection" className="mt-4">
            <ScheduleCollectionPanel onChanged={load} />
          </TabsContent>
          <TabsContent value="conferences" className="mt-4">
            <div className="mb-3 grid gap-2 rounded-2xl border border-[#2F6B3F]/10 bg-white p-3 shadow-sm sm:grid-cols-[1fr_190px]">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="학회명 또는 약어 검색"
                aria-label="학회 검색"
              />
              <NativeSelect
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <NativeSelectOption value="ALL">전체 상태</NativeSelectOption>
                <NativeSelectOption value="PUBLISHED">공개</NativeSelectOption>
                <NativeSelectOption value="DRAFT">임시 저장</NativeSelectOption>
                <NativeSelectOption value="HIDDEN">숨김</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#2F6B3F]/10 bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-[#FFF9DA]">
                  <TableRow>
                    <TableHead className="pl-5">학회</TableHead>
                    <TableHead>분야</TableHead>
                    <TableHead>공식 일정</TableHead>
                    <TableHead>다음 일정</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="pr-5 text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleConferences.map((conference) => (
                    <TableRow key={conference.id}>
                      <TableCell className="pl-5">
                        <p className="font-black text-[#204F31]">
                          {conference.acronym || '약어 없음'}{' '}
                          {conference.edition_year ?? ''}
                        </p>
                        <p className="mt-1 max-w-[360px] truncate text-xs text-[#748078]">
                          {conference.name}
                        </p>
                        <p className="mt-1 text-xs text-[#8A948D]">
                          {conference.country_code} · {conference.format}
                        </p>
                      </TableCell>
                      <TableCell>{conference.research_field_count}개</TableCell>
                      <TableCell>{conference.milestone_count}개</TableCell>
                      <TableCell>
                        <p className="font-bold text-[#2F6B3F]">
                          {dDay(conference.next_milestone_at)}
                        </p>
                        {conference.next_milestone_at && (
                          <p className="mt-1 text-xs text-[#748078]">
                            {conference.next_milestone_at.slice(0, 10)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            conference.status === 'PUBLISHED'
                              ? 'bg-[#E1F0DD] text-[#2F6B3F]'
                              : conference.status === 'HIDDEN'
                                ? 'bg-[#ECEDEB] text-[#58625A]'
                                : 'bg-[#FFF6C0] text-[#6D5318]'
                          }
                        >
                          {statusLabel(conference.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void openEditor(conference)}
                        >
                          <Pencil /> 편집
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && visibleConferences.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-14 text-center text-[#748078]"
                      >
                        조건에 맞는 학회가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="mt-4">
            <div className="mb-3 flex justify-end">
              <Button
                variant="outline"
                className="bg-white"
                onClick={() =>
                  setSourceDraft({
                    id: 0,
                    name: '',
                    base_url: '',
                    source_type: 'WEB_PAGE',
                    is_active: 1,
                    last_collected_at: null,
                  })
                }
              >
                <Plus /> 출처 추가
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sources.map((source) => (
                <article
                  key={source.id}
                  className="rounded-2xl border border-[#2F6B3F]/10 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="grid size-10 place-items-center rounded-xl bg-[#E5F1DF] text-[#2F6B3F]">
                      <Database className="size-5" />
                    </div>
                    <Badge
                      className={
                        source.is_active
                          ? 'bg-[#7FB77E]/20 text-[#2F6B3F]'
                          : 'bg-[#ECEDEB] text-[#58625A]'
                      }
                    >
                      {source.is_active ? '활성' : '중지'}
                    </Badge>
                  </div>
                  <h2 className="mt-4 font-black text-[#204F31]">
                    {source.name}
                  </h2>
                  <a
                    href={source.base_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-sm text-[#4D755A] underline underline-offset-4"
                  >
                    {source.base_url}
                  </a>
                  <div className="mt-4 flex items-center justify-between border-t border-[#2F6B3F]/8 pt-4 text-xs text-[#748078]">
                    <span>{source.source_type}</span>
                    <span>
                      최근 수집{' '}
                      {source.last_collected_at
                        ? source.last_collected_at.slice(0, 10)
                        : '기록 없음'}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSourceDraft(source)}
                    >
                      설정
                    </Button>
                    <Button
                      size="sm"
                      variant={source.is_active ? 'outline' : 'default'}
                      className={source.is_active ? '' : 'bg-[#2F6B3F]'}
                      onClick={() => void toggleSource(source)}
                    >
                      {source.is_active ? '수집 중지' : '수집 활성화'}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="catalog" className="mt-4">
            <div className="rounded-2xl border border-[#2F6B3F]/10 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-black text-[#204F31]">
                    CS 분야 우수 학술대회 CSV
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[#68746B]">
                    모든 원본 행을 보존하고, 발표 형태 중복은 학회 단위로
                    병합하며 Findings는 트랙으로 연결합니다.
                  </p>
                  <p className="mt-2 text-xs text-[#7B867E]">
                    원본 {catalogStatus?.row_count ?? 0}행 · 정규화{' '}
                    {catalogStatus?.series_count ?? 0}개 · 마지막 동기화{' '}
                    {catalogStatus?.last_synced_at
                      ? new Date(catalogStatus.last_synced_at).toLocaleString(
                          'ko-KR',
                        )
                      : '기록 없음'}
                  </p>
                  {catalogStatus?.error_message && (
                    <p className="mt-2 text-sm font-semibold text-red-700">
                      {catalogStatus.error_message}
                    </p>
                  )}
                </div>
                <Button
                  className="w-fit bg-[#2F6B3F] text-white"
                  onClick={() => void synchronizeCatalog()}
                  disabled={syncingCatalog}
                >
                  <CloudDownload
                    className={syncingCatalog ? 'animate-pulse' : ''}
                  />
                  {syncingCatalog ? '동기화 중…' : 'Gist CSV 동기화'}
                </Button>
              </div>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-[#2F6B3F]/10 bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-[#FFF9DA]">
                  <TableRow>
                    <TableHead className="pl-5">학회</TableHead>
                    <TableHead>DBLP Key</TableHead>
                    <TableHead>원본 행</TableHead>
                    <TableHead>병합 정보</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-5">
                        <p className="font-black text-[#204F31]">
                          {item.acronym}
                        </p>
                        <p className="mt-1 max-w-[480px] text-xs text-[#68746B]">
                          {item.name}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.dblp_key}
                      </TableCell>
                      <TableCell>{item.source_row_count}행</TableCell>
                      <TableCell className="text-xs text-[#68746B]">
                        {[item.presentation_types, item.tracks]
                          .filter(Boolean)
                          .join(' · ') || '단일 행'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && catalogItems.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-14 text-center text-[#748078]"
                      >
                        Gist CSV 동기화를 실행해 주세요.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog
        open={conferenceDraft !== null}
        onOpenChange={(open) => !open && setConferenceDraft(null)}
      >
        <DialogContent className="max-h-[92vh] overflow-hidden border-[#2F6B3F]/12 bg-[#FFFDF5] sm:max-w-5xl">
          {conferenceDraft && (
            <form
              onSubmit={saveConference}
              className="flex max-h-[86vh] flex-col"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-[#204F31]">
                  {conferenceDraft.id ? '학회 및 공식 일정 편집' : '학회 등록'}
                </DialogTitle>
                <DialogDescription>
                  메인 캘린더에 표시할 학회 정보, ACM CCS 분야, 공식 일정명과
                  링크를 함께 관리합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 space-y-7 overflow-y-auto pr-2">
                <EditorSection icon={Globe2} title="기본 정보">
                  <div className="grid gap-3">
                    <Input
                      required
                      value={conferenceDraft.name}
                      onChange={(event) =>
                        updateDraft('name', event.target.value)
                      }
                      placeholder="학회 전체 이름"
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        value={conferenceDraft.acronym}
                        onChange={(event) =>
                          updateDraft('acronym', event.target.value)
                        }
                        placeholder="약어"
                      />
                      <Input
                        required
                        type="number"
                        value={conferenceDraft.edition_year}
                        onChange={(event) =>
                          updateDraft('edition_year', event.target.value)
                        }
                        placeholder="개최 연도"
                      />
                      <NativeSelect
                        value={conferenceDraft.status}
                        onChange={(event) =>
                          updateDraft(
                            'status',
                            event.target.value as ConferenceDraft['status'],
                          )
                        }
                      >
                        <NativeSelectOption value="DRAFT">
                          임시 저장
                        </NativeSelectOption>
                        <NativeSelectOption value="PUBLISHED">
                          공개
                        </NativeSelectOption>
                        <NativeSelectOption value="HIDDEN">
                          숨김
                        </NativeSelectOption>
                      </NativeSelect>
                    </div>
                    <Textarea
                      value={conferenceDraft.description}
                      onChange={(event) =>
                        updateDraft('description', event.target.value)
                      }
                      placeholder="학회 소개"
                    />
                    <div className="grid gap-3 sm:grid-cols-4">
                      <Input
                        required
                        maxLength={2}
                        value={conferenceDraft.country_code}
                        onChange={(event) =>
                          updateDraft('country_code', event.target.value)
                        }
                        placeholder="국가 코드 (KR)"
                      />
                      <Input
                        value={conferenceDraft.city}
                        onChange={(event) =>
                          updateDraft('city', event.target.value)
                        }
                        placeholder="도시"
                      />
                      <Input
                        value={conferenceDraft.venue}
                        onChange={(event) =>
                          updateDraft('venue', event.target.value)
                        }
                        placeholder="개최 장소"
                      />
                      <NativeSelect
                        value={conferenceDraft.format}
                        onChange={(event) =>
                          updateDraft(
                            'format',
                            event.target.value as ConferenceDraft['format'],
                          )
                        }
                      >
                        <NativeSelectOption value="UNKNOWN">
                          미확인
                        </NativeSelectOption>
                        <NativeSelectOption value="ONSITE">
                          오프라인
                        </NativeSelectOption>
                        <NativeSelectOption value="ONLINE">
                          온라인
                        </NativeSelectOption>
                        <NativeSelectOption value="HYBRID">
                          하이브리드
                        </NativeSelectOption>
                      </NativeSelect>
                    </div>
                  </div>
                </EditorSection>

                <EditorSection icon={ListTree} title="ACM CCS 분야">
                  <p className="mb-3 text-sm text-[#748078]">
                    여러 분야를 선택할 수 있으며, 대표 분야는 하나만 지정합니다.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {fields.map((field) => {
                      const checked =
                        conferenceDraft.research_field_ids.includes(field.id);
                      const checkboxId = `field-${field.id}`;
                      return (
                        <div
                          key={field.id}
                          className={`rounded-xl border p-3 ${checked ? 'border-[#7FB77E] bg-[#F0F7EC]' : 'border-[#2F6B3F]/10 bg-white'}`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id={checkboxId}
                              checked={checked}
                              onCheckedChange={(value) => {
                                const next = value
                                  ? [
                                      ...conferenceDraft.research_field_ids,
                                      field.id,
                                    ]
                                  : conferenceDraft.research_field_ids.filter(
                                      (id) => id !== field.id,
                                    );
                                updateDraft('research_field_ids', next);
                                if (
                                  !value &&
                                  conferenceDraft.primary_research_field_id ===
                                    field.id
                                )
                                  updateDraft(
                                    'primary_research_field_id',
                                    next[0] ?? null,
                                  );
                              }}
                            />
                            <label
                              htmlFor={checkboxId}
                              className="cursor-pointer"
                            >
                              <span className="block text-sm font-bold">
                                {field.name_ko}
                              </span>
                              <span className="mt-0.5 block text-xs text-[#748078]">
                                {field.name_en}
                              </span>
                            </label>
                          </div>
                          {checked && (
                            <button
                              type="button"
                              className={`mt-2 text-xs font-bold ${conferenceDraft.primary_research_field_id === field.id ? 'text-[#2F6B3F]' : 'text-[#89928B] underline'}`}
                              onClick={() =>
                                updateDraft(
                                  'primary_research_field_id',
                                  field.id,
                                )
                              }
                            >
                              {conferenceDraft.primary_research_field_id ===
                              field.id
                                ? '대표 분야'
                                : '대표 분야로 지정'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </EditorSection>

                {conferenceDraft.id && (
                  <ScheduleImportEditor
                    conferenceId={conferenceDraft.id}
                    milestones={conferenceDraft.milestones}
                    onChange={(items) => updateDraft('milestones', items)}
                  />
                )}
                <EditorSection icon={CalendarDays} title="공식 일정">
                  <p className="mb-3 text-sm text-[#748078]">
                    학회가 사용하는 구분명과 일정명을 그대로 입력합니다. 예:
                    Papers · Submission Due
                  </p>
                  <div className="space-y-3">
                    {conferenceDraft.milestones.map((item, index) => (
                      <div
                        key={index}
                        className="grid gap-2 rounded-xl border border-[#2F6B3F]/10 bg-white p-3 lg:grid-cols-[1fr_1.3fr_1.2fr_0.7fr_auto]"
                      >
                        <Input
                          value={item.group_name}
                          onChange={(event) =>
                            updateDraft(
                              'milestones',
                              conferenceDraft.milestones.map((row, i) =>
                                i === index
                                  ? { ...row, group_name: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="구분명 (Papers)"
                        />
                        <Input
                          required
                          value={item.title}
                          onChange={(event) =>
                            updateDraft(
                              'milestones',
                              conferenceDraft.milestones.map((row, i) =>
                                i === index
                                  ? { ...row, title: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="공식 일정명"
                        />
                        <Input
                          required
                          type={item.time_confirmed ? 'datetime-local' : 'date'}
                          aria-label="시작 일시"
                          value={item.event_at}
                          onChange={(event) =>
                            updateDraft(
                              'milestones',
                              conferenceDraft.milestones.map((row, i) =>
                                i === index
                                  ? { ...row, event_at: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                        <Input
                          required
                          value={item.original_timezone}
                          onChange={(event) =>
                            updateDraft(
                              'milestones',
                              conferenceDraft.milestones.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      original_timezone: event.target.value,
                                    }
                                  : row,
                              ),
                            )
                          }
                          placeholder="AoE / Asia/Seoul"
                        />
                        <div className="lg:col-span-full flex flex-wrap gap-3 items-center text-xs">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.time_confirmed}
                              onChange={(e) =>
                                updateDraft(
                                  'milestones',
                                  conferenceDraft.milestones.map((row, i) =>
                                    i === index
                                      ? {
                                          ...row,
                                          time_confirmed: e.target.checked,
                                          event_at: e.target.checked
                                            ? row.event_at.slice(0, 10) +
                                              'T00:00'
                                            : row.event_at.slice(0, 10),
                                          end_at: null,
                                        }
                                      : row,
                                  ),
                                )
                              }
                            />
                            시각이 공식적으로 명시됨
                          </label>
                          <label htmlFor={`end-date-${index}`}>
                            종료 일시(선택){' '}
                            <Input
                              id={`end-date-${index}`}
                              type={
                                item.time_confirmed ? 'datetime-local' : 'date'
                              }
                              value={item.end_at || ''}
                              onChange={(e) =>
                                updateDraft(
                                  'milestones',
                                  conferenceDraft.milestones.map((row, i) =>
                                    i === index
                                      ? {
                                          ...row,
                                          end_at: e.target.value || null,
                                        }
                                      : row,
                                  ),
                                )
                              }
                            />
                          </label>
                          {item.source_url && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline text-[#2F6B3F]"
                            >
                              원본 근거 ({item.source_kind})
                            </a>
                          )}
                          {item.source_text && (
                            <details className="w-full">
                              <summary>추출 근거 보기</summary>
                              <p className="whitespace-pre-wrap p-2">
                                {item.source_text}
                              </p>
                            </details>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-red-600"
                          aria-label="일정 삭제"
                          onClick={() =>
                            updateDraft(
                              'milestones',
                              conferenceDraft.milestones.filter(
                                (_, i) => i !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3"
                    onClick={() =>
                      updateDraft('milestones', [
                        ...conferenceDraft.milestones,
                        {
                          group_name: '',
                          title: '',
                          event_at: '',
                          original_timezone: 'AoE',
                          time_confirmed: true,
                        },
                      ])
                    }
                  >
                    <Plus /> 공식 일정 추가
                  </Button>
                </EditorSection>

                <EditorSection icon={Link2} title="관련 링크">
                  <div className="space-y-3">
                    {conferenceDraft.links.map((item, index) => (
                      <div
                        key={index}
                        className="grid gap-2 rounded-xl border border-[#2F6B3F]/10 bg-white p-3 lg:grid-cols-[0.8fr_1fr_2fr_auto]"
                      >
                        <NativeSelect
                          value={item.type}
                          onChange={(event) =>
                            updateDraft(
                              'links',
                              conferenceDraft.links.map((row, i) =>
                                i === index
                                  ? { ...row, type: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        >
                          <NativeSelectOption value="HOMEPAGE">
                            공식 홈페이지
                          </NativeSelectOption>
                          <NativeSelectOption value="SUBMISSION">
                            논문 제출
                          </NativeSelectOption>
                          <NativeSelectOption value="REGISTRATION">
                            등록
                          </NativeSelectOption>
                          <NativeSelectOption value="OTHER">
                            기타
                          </NativeSelectOption>
                        </NativeSelect>
                        <Input
                          required
                          value={item.label}
                          onChange={(event) =>
                            updateDraft(
                              'links',
                              conferenceDraft.links.map((row, i) =>
                                i === index
                                  ? { ...row, label: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="표시 이름"
                        />
                        <Input
                          required
                          type="url"
                          value={item.url}
                          onChange={(event) =>
                            updateDraft(
                              'links',
                              conferenceDraft.links.map((row, i) =>
                                i === index
                                  ? { ...row, url: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="https://"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-red-600"
                          aria-label="링크 삭제"
                          onClick={() =>
                            updateDraft(
                              'links',
                              conferenceDraft.links.filter(
                                (_, i) => i !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3"
                    onClick={() =>
                      updateDraft('links', [
                        ...conferenceDraft.links,
                        {
                          type: 'HOMEPAGE',
                          label: '',
                          url: '',
                          is_active: true,
                        },
                      ])
                    }
                  >
                    <Plus /> 링크 추가
                  </Button>
                </EditorSection>
              </div>
              <DialogFooter className="mt-5 border-t border-[#2F6B3F]/10 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConferenceDraft(null)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#2F6B3F] hover:bg-[#245832]"
                >
                  {saving
                    ? '저장 중…'
                    : conferenceDraft.status === 'PUBLISHED'
                      ? '저장하고 공개'
                      : '저장'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={sourceDraft !== null}
        onOpenChange={(open) => !open && setSourceDraft(null)}
      >
        <DialogContent className="border-[#2F6B3F]/12 bg-[#FFFDF5] sm:max-w-lg">
          {sourceDraft && (
            <form onSubmit={saveSource}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-[#204F31]">
                  {sourceDraft.id ? '수집 출처 설정' : '수집 출처 추가'}
                </DialogTitle>
                <DialogDescription>
                  자동 수집에 사용할 공식 페이지나 데이터 출처를 관리합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 grid gap-3">
                <Input
                  required
                  value={sourceDraft.name}
                  onChange={(event) =>
                    setSourceDraft({ ...sourceDraft, name: event.target.value })
                  }
                  placeholder="출처 이름"
                />
                <Input
                  required
                  type="url"
                  value={sourceDraft.base_url}
                  onChange={(event) =>
                    setSourceDraft({
                      ...sourceDraft,
                      base_url: event.target.value,
                    })
                  }
                  placeholder="https://"
                />
                <NativeSelect
                  value={sourceDraft.source_type}
                  onChange={(event) =>
                    setSourceDraft({
                      ...sourceDraft,
                      source_type: event.target
                        .value as SourceSite['source_type'],
                    })
                  }
                >
                  <NativeSelectOption value="WEB_PAGE">
                    웹 페이지
                  </NativeSelectOption>
                  <NativeSelectOption value="API">API</NativeSelectOption>
                  <NativeSelectOption value="RSS">RSS</NativeSelectOption>
                </NativeSelect>
                <div className="flex items-center gap-2 rounded-xl border border-[#2F6B3F]/10 bg-white p-3 text-sm font-semibold">
                  <Checkbox
                    id="source-active"
                    checked={Boolean(sourceDraft.is_active)}
                    onCheckedChange={(value) =>
                      setSourceDraft({
                        ...sourceDraft,
                        is_active: value ? 1 : 0,
                      })
                    }
                  />
                  <label htmlFor="source-active">이 출처에서 자동 수집</label>
                </div>
              </div>
              <DialogFooter className="mt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSourceDraft(null)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#2F6B3F]"
                >
                  저장
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditorSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Globe2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-[#E5F1DF] text-[#2F6B3F]">
          <Icon className="size-4" />
        </span>
        <h2 className="text-lg font-black text-[#204F31]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
