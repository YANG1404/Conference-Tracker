'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type Milestone = {
  id: number;
  type: string;
  groupName: string | null;
  title: string;
  eventAt: string;
  originalTimezone: string;
  timeConfirmed: boolean;
  dDay: number;
};

type Conference = {
  id: number;
  acronym: string;
  name: string;
  category: string;
  region: '국내' | '해외';
  format: '온라인' | '오프라인' | '하이브리드';
  location: string;
  description: string;
  links: { label: string; url: string }[];
  milestones: Milestone[];
  tone: 'green' | 'gold' | 'mint';
};

type ApiMilestone = {
  id: number;
  type: string;
  group_name: string | null;
  title: string | null;
  event_at: string;
  original_timezone: string;
  time_confirmed: boolean;
  d_day: number;
};

type ApiConference = {
  id: number;
  acronym: string | null;
  name: string;
  description: string | null;
  country_code: string;
  city: string | null;
  format: 'ONSITE' | 'ONLINE' | 'HYBRID';
  is_domestic: boolean;
  research_fields: Array<{ name_ko: string }>;
  milestones: ApiMilestone[];
  links: Array<{ label: string; url: string }>;
};

type SelectedEvent = { conferenceId: number; milestoneId: number };

const chiMilestones: Milestone[] = [
  [1, 'Papers', 'Submission Due', '2026-09-10T23:59:00Z', true],
  [7, 'Papers', 'Reviews Released', '2026-11-05T12:00:00Z', false],
  [8, 'Papers', 'Resubmission Due', '2026-12-03T23:59:00Z', true],
  [9, 'Papers', 'Notification', '2026-12-17T12:00:00Z', false],
  [14, 'Panels', 'Submission Due', '2026-11-19T23:59:00Z', true],
  [16, 'Workshops', 'Organizer Submission Due', '2026-10-01T23:59:00Z', true],
  [17, 'Workshops', 'Notification', '2026-11-19T12:00:00Z', false],
  [
    18,
    'Workshops',
    'Accepted Workshops Websites Up',
    '2026-12-17T12:00:00Z',
    false,
  ],
].map(([id, groupName, title, eventAt, timeConfirmed]) => ({
  id: Number(id),
  type: 'OFFICIAL_EVENT',
  groupName: String(groupName),
  title: String(title),
  eventAt: String(eventAt),
  originalTimezone: 'AoE',
  timeConfirmed: Boolean(timeConfirmed),
  dDay: dayOffset(String(eventAt)),
}));

const demoConferences: Conference[] = [
  {
    id: 1,
    acronym: 'CHI 2027',
    name: 'ACM Conference on Human Factors in Computing Systems',
    category: '인간 중심 컴퓨팅',
    region: '해외',
    format: '오프라인',
    location: 'Barcelona, Spain',
    description: '사람과 컴퓨팅 기술의 상호작용을 다루는 국제 학술대회입니다.',
    links: [
      { label: '공식 홈페이지', url: 'https://chi2027.acm.org/' },
      { label: '논문 제출', url: 'https://new.precisionconference.com/' },
    ],
    milestones: chiMilestones,
    tone: 'green',
  },
  ...[
    [
      2,
      'KSC 2026',
      '한국소프트웨어종합학술대회',
      '소프트웨어 및 소프트웨어 공학',
      '국내',
      '오프라인',
      'Jeju, KR',
      'Regular Papers',
      'Submission Opens',
      '2026-09-08T00:00:00Z',
      'Asia/Seoul',
      'mint',
    ],
    [
      3,
      'AAAI 2027',
      'AAAI Conference on Artificial Intelligence',
      '컴퓨팅 방법론',
      '해외',
      '하이브리드',
      'Vancouver, CA',
      'Main Track',
      'Submission Deadline',
      '2026-09-12T23:59:00Z',
      'AoE',
      'gold',
    ],
    [
      4,
      'ICSE 2027',
      'International Conference on Software Engineering',
      '소프트웨어 및 소프트웨어 공학',
      '국내',
      '오프라인',
      'Seoul, KR',
      'Research Track',
      'Author Notification',
      '2026-09-18T17:00:00Z',
      'UTC',
      'green',
    ],
    [
      5,
      'NeurIPS 2026',
      'Conference on Neural Information Processing Systems',
      '컴퓨팅 방법론',
      '해외',
      '하이브리드',
      'San Diego, US',
      'Authors',
      'Author Registration Deadline',
      '2026-09-22T23:59:00Z',
      'AoE',
      'gold',
    ],
    [
      6,
      'UIST 2026',
      'ACM Symposium on User Interface Software and Technology',
      '인간 중심 컴퓨팅',
      '국내',
      '오프라인',
      'Busan, KR',
      'Technical Papers',
      'Final Submission Deadline',
      '2026-09-25T23:59:00Z',
      'AoE',
      'mint',
    ],
  ].map((item) => ({
    id: Number(item[0]),
    acronym: String(item[1]),
    name: String(item[2]),
    category: String(item[3]),
    region: item[4] as Conference['region'],
    format: item[5] as Conference['format'],
    location: String(item[6]),
    description: '컴퓨팅 분야 연구 성과를 공유하는 학술대회입니다.',
    links: [{ label: '공식 홈페이지', url: '#' }],
    milestones: [
      {
        id: Number(item[0]),
        type: 'OFFICIAL_EVENT',
        groupName: String(item[7]),
        title: String(item[8]),
        eventAt: String(item[9]),
        originalTimezone: String(item[10]),
        timeConfirmed: true,
        dDay: dayOffset(String(item[9])),
      },
    ],
    tone: item[11] as Conference['tone'],
  })),
];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
const calendarDays = Array.from({ length: 35 }, (_, index) => index - 1);
const categories = [
  '일반 및 참조',
  '하드웨어',
  '컴퓨터 시스템 구성',
  '네트워크',
  '소프트웨어 및 소프트웨어 공학',
  '계산 이론',
  '컴퓨팅 수학',
  '정보 시스템',
  '보안 및 개인정보 보호',
  '인간 중심 컴퓨팅',
  '컴퓨팅 방법론',
  '응용 컴퓨팅',
  '사회 및 전문 주제',
];

function dayOffset(eventAt: string) {
  const eventDate = eventAt.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const today = `${value.year}-${value.month}-${value.day}`;
  return Math.round(
    (Date.parse(`${eventDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );
}

function dDayLabel(value: number) {
  if (value === 0) return 'D-Day';
  return value > 0 ? `D-${value}` : `D+${Math.abs(value)}`;
}

function milestoneLabel(milestone: Milestone) {
  return [milestone.groupName, milestone.title].filter(Boolean).join(' – ');
}

function formatDate(milestone: Milestone, compact = false) {
  const options: Intl.DateTimeFormatOptions = milestone.timeConfirmed
    ? {
        year: compact ? undefined : 'numeric',
        month: compact ? 'numeric' : 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }
    : {
        year: compact ? undefined : 'numeric',
        month: compact ? 'numeric' : 'long',
        day: 'numeric',
        timeZone: 'UTC',
      };
  return new Intl.DateTimeFormat('ko-KR', options).format(
    new Date(milestone.eventAt),
  );
}

function formatDeadlineDate(milestone: Milestone) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(milestone.eventAt));
}

function formatDeadlineTime(milestone: Milestone) {
  if (!milestone.timeConfirmed) return milestone.originalTimezone;

  const time = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(milestone.eventAt));

  return `${time} · ${milestone.originalTimezone}`;
}

function EventPill({
  conference,
  milestone,
  onSelect,
}: {
  conference: Conference;
  milestone: Milestone;
  onSelect: (value: SelectedEvent) => void;
}) {
  const tone = {
    green: 'border-[#2F6B3F]/20 bg-[#2F6B3F] text-white',
    gold: 'border-[#E2AD36] bg-[#F7C85C] text-[#29342B]',
    mint: 'border-[#6AA56B] bg-[#7FB77E] text-[#173B25]',
  }[conference.tone];

  return (
    <button
      type="button"
      onClick={() =>
        onSelect({ conferenceId: conference.id, milestoneId: milestone.id })
      }
      className={`group w-full rounded-md border px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tone}`}
    >
      <span className="block truncate text-[0.72rem] font-bold leading-tight">
        {conference.acronym}
      </span>
      <span className="mt-0.5 hidden truncate text-[0.68rem] opacity-85 xl:block">
        {milestoneLabel(milestone)}
      </span>
    </button>
  );
}

export function ConferenceWorkspace({
  userName,
  isAdmin,
}: {
  userName: string | null;
  isAdmin: boolean;
}) {
  const [conferenceItems, setConferenceItems] =
    useState<Conference[]>(demoConferences);
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [region, setRegion] = useState('전체 지역');
  const [format, setFormat] = useState('전체 방식');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(
    null,
  );
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [mobileFilters, setMobileFilters] = useState(false);
  const currentCalendarDay = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      day: '2-digit',
    }).format(new Date()),
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return conferenceItems.filter((conference) => {
      const matchesQuery =
        !normalized ||
        conference.acronym.toLowerCase().includes(normalized) ||
        conference.name.toLowerCase().includes(normalized);
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(conference.category);
      const matchesRegion =
        region === '전체 지역' || conference.region === region;
      const matchesFormat =
        format === '전체 방식' || conference.format === format;
      const matchesPinned = !pinnedOnly || pinnedIds.includes(conference.id);
      return (
        matchesQuery &&
        matchesCategory &&
        matchesRegion &&
        matchesFormat &&
        matchesPinned
      );
    });
  }, [
    query,
    selectedCategories,
    region,
    format,
    pinnedOnly,
    pinnedIds,
    conferenceItems,
  ]);

  const calendarEvents = useMemo(
    () =>
      filtered
        .flatMap((conference) =>
          conference.milestones
            .filter((milestone) => milestone.eventAt.startsWith('2026-09'))
            .map((milestone) => ({ conference, milestone })),
        )
        .sort((a, b) => a.milestone.eventAt.localeCompare(b.milestone.eventAt)),
    [filtered],
  );

  const selected = selectedEvent
    ? (conferenceItems.find(
        (conference) => conference.id === selectedEvent.conferenceId,
      ) ?? null)
    : null;
  const selectedMilestone =
    selected && selectedEvent
      ? (selected.milestones.find(
          (milestone) => milestone.id === selectedEvent.milestoneId,
        ) ??
        selected.milestones[0] ??
        null)
      : null;

  useEffect(() => {
    fetch('/api/v1/conferences')
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { items: ApiConference[] })
          : null,
      )
      .then((data) => {
        if (!data?.items?.length) return;
        const tones: Conference['tone'][] = ['green', 'mint', 'gold'];
        setConferenceItems(
          data.items.map((item, index) => {
            const categoryName =
              item.research_fields?.[0]?.name_ko ?? '일반 및 참조';
            return {
              id: item.id,
              acronym: item.acronym ?? item.name,
              name: item.name,
              category: categoryName,
              region: item.is_domestic ? '국내' : '해외',
              format:
                item.format === 'ONLINE'
                  ? '온라인'
                  : item.format === 'HYBRID'
                    ? '하이브리드'
                    : '오프라인',
              location: [item.city, item.country_code]
                .filter(Boolean)
                .join(', '),
              description:
                item.description ?? '학회 상세 설명이 준비 중입니다.',
              links: item.links.map((link) => ({
                label: link.label,
                url: link.url,
              })),
              milestones: item.milestones.map((milestone) => ({
                id: milestone.id,
                type: milestone.type,
                groupName: milestone.group_name,
                title: milestone.title ?? 'Official schedule',
                eventAt: milestone.event_at,
                originalTimezone: milestone.original_timezone,
                timeConfirmed: milestone.time_confirmed,
                dDay: milestone.d_day ?? dayOffset(milestone.event_at),
              })),
              tone: tones[index % tones.length],
            } satisfies Conference;
          }),
        );
      })
      .catch(() => undefined);

    fetch('/api/v1/me/pins')
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as {
              items: Array<{ conference_id: number }>;
            })
          : null,
      )
      .then(
        (data) =>
          data?.items &&
          setPinnedIds(data.items.map((pin) => pin.conference_id)),
      )
      .catch(() => undefined);
  }, []);

  const togglePin = async (id: number) => {
    const isPinned = pinnedIds.includes(id);
    setPinnedIds((current) =>
      isPinned ? current.filter((item) => item !== id) : [...current, id],
    );
    const response = await fetch(`/api/v1/me/pins/${id}`, {
      method: isPinned ? 'DELETE' : 'PUT',
    });
    if (!response.ok)
      setPinnedIds((current) =>
        isPinned ? [...current, id] : current.filter((item) => item !== id),
      );
  };

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'set_conference_pin',
          title: '관심 학회 설정',
          description:
            'Conference Tracker에서 지정한 학회를 관심 학회로 저장하거나 해제합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              conference_id: { type: 'integer', minimum: 1 },
              pinned: { type: 'boolean' },
            },
            required: ['conference_id', 'pinned'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input) {
            if (!input || typeof input !== 'object')
              throw new Error('입력 형식이 올바르지 않습니다.');
            const { conference_id, pinned } = input as {
              conference_id?: unknown;
              pinned?: unknown;
            };
            if (
              !Number.isInteger(conference_id) ||
              Number(conference_id) < 1 ||
              typeof pinned !== 'boolean'
            )
              throw new Error('conference_id와 pinned 값을 확인해 주세요.');
            const id = Number(conference_id);
            const response = await fetch(`/api/v1/me/pins/${id}`, {
              method: pinned ? 'PUT' : 'DELETE',
            });
            if (!response.ok) throw new Error('관심 학회 변경에 실패했습니다.');
            setPinnedIds((current) =>
              pinned
                ? [...new Set([...current, id])]
                : current.filter((item) => item !== id),
            );
            return { conference_id: id, pinned };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const resetFilters = () => {
    setQuery('');
    setSelectedCategories([]);
    setRegion('전체 지역');
    setFormat('전체 방식');
    setPinnedOnly(false);
  };

  const toggleCategory = (category: string, checked: boolean) => {
    setSelectedCategories((current) =>
      checked
        ? [...new Set([...current, category])]
        : current.filter((item) => item !== category),
    );
  };

  return (
    <div className="min-h-screen bg-[#FFFDF2] text-[#203126]">
      <header className="sticky top-0 z-40 border-b border-[#2F6B3F]/10 bg-[#FFFDF2]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-fit items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#2F6B3F] text-[#FFF6C0] shadow-[0_7px_18px_rgba(47,107,63,0.24)]">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="font-extrabold tracking-[-0.02em] text-[#204F31]">
                Conference Tracker
              </p>
              <p className="text-xs text-[#607064]">
                Computing conference calendar
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="ml-auto h-11 rounded-full border-[#2F6B3F]/12 bg-white py-1.5 pl-1.5 pr-2 shadow-none hover:bg-[#F5FAF2] sm:pr-3"
                  aria-label="계정 메뉴 열기"
                />
              }
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#7FB77E] text-sm font-bold text-white">
                {(userName ?? 'CT').slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-40 truncate text-sm font-semibold sm:block">
                {userName ?? '데모 사용자'}
              </span>
              <ChevronDown className="size-3.5 text-[#627066]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-64 border border-[#2F6B3F]/12 bg-[#FFFDF7] p-2"
            >
              <DropdownMenuLabel className="px-2 py-2">
                <span className="block truncate text-sm font-bold text-[#294432]">
                  {userName ?? '데모 사용자'}
                </span>
                <span className="mt-0.5 block text-xs font-normal text-[#748078]">
                  {isAdmin ? '관리자 계정' : '일반 사용자'}
                </span>
              </DropdownMenuLabel>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    render={
                      <button
                        type="button"
                        aria-label="관리자 페이지 열기"
                        onClick={() => window.location.assign('/admin')}
                      />
                    }
                    className="px-2.5 py-2.5 font-semibold text-[#294432] focus:bg-[#7FB77E]/15"
                  >
                    <ShieldCheck className="text-[#2F6B3F]" /> 관리자 페이지
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px]">
        <main
          id="calendar"
          className="min-w-0 px-4 py-6 pb-10 sm:px-6 lg:px-8 lg:py-8"
        >
          <section className="mx-auto max-w-[1500px]">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="bg-[#7FB77E]/18 text-[#2F6B3F] hover:bg-[#7FB77E]/18">
                    2026년 9월
                  </Badge>
                  <span className="text-xs text-[#748078]">예시 일정</span>
                </div>
                <h1 className="text-2xl font-black tracking-[-0.035em] text-[#183E28] sm:text-3xl">
                  학회 일정을 한눈에 관리하세요
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#68746B] sm:text-base">
                  학회가 발표한 공식 일정명을 기준으로 중요한 날짜를 확인할 수
                  있습니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl border border-[#2F6B3F]/12 bg-white p-1 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="이전 달"
                    className="text-[#2F6B3F]"
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="min-w-28 text-center text-sm font-bold">
                    2026년 9월
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="다음 달"
                    className="text-[#2F6B3F]"
                  >
                    <ChevronRight />
                  </Button>
                </div>
                <div className="flex rounded-xl border border-[#2F6B3F]/12 bg-white p-1 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="캘린더 보기"
                    onClick={() => setView('calendar')}
                    className={
                      view === 'calendar'
                        ? 'bg-[#2F6B3F] text-white hover:bg-[#2F6B3F]'
                        : ''
                    }
                  >
                    <LayoutGrid />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="목록 보기"
                    onClick={() => setView('list')}
                    className={
                      view === 'list'
                        ? 'bg-[#2F6B3F] text-white hover:bg-[#2F6B3F]'
                        : ''
                    }
                  >
                    <List />
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#2F6B3F]/10 bg-white p-3 shadow-[0_12px_35px_rgba(47,107,63,0.06)]">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#6A786D]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="학회명 또는 약어 검색"
                  aria-label="학회 검색"
                  className="h-11 rounded-xl border-[#2F6B3F]/15 bg-[#FFFDF7] pl-10 placeholder:text-[#8C978E] focus-visible:border-[#2F6B3F] focus-visible:ring-[#7FB77E]/30"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#2F6B3F]/8 pt-3">
                <Button
                  variant="ghost"
                  className="h-10 gap-2 font-bold text-[#2F6B3F] sm:hidden"
                  onClick={() => setMobileFilters(!mobileFilters)}
                >
                  {mobileFilters ? <X /> : <Filter />} 필터
                </Button>
                <div
                  className={`${mobileFilters ? 'flex' : 'hidden'} w-full flex-wrap gap-2 sm:flex sm:w-auto`}
                >
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 w-full justify-between border-[#2F6B3F]/15 bg-white text-[#405047] sm:w-52"
                          aria-label="ACM CCS 연구 분야 선택"
                        />
                      }
                    >
                      <span className="truncate">
                        {selectedCategories.length === 0
                          ? '전체 분야'
                          : selectedCategories.length === 1
                            ? selectedCategories[0]
                            : `${selectedCategories.length}개 분야 선택`}
                      </span>
                      <ChevronDown className="size-3.5 shrink-0" />
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[min(22rem,calc(100vw-2rem))] gap-0 overflow-hidden border-[#2F6B3F]/12 bg-[#FFFDF7] p-0"
                    >
                      <PopoverHeader className="border-b border-[#2F6B3F]/10 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <PopoverTitle className="font-black text-[#294432]">
                              ACM CCS 연구 분야
                            </PopoverTitle>
                            <p className="mt-0.5 text-xs text-[#748078]">
                              여러 분야를 선택하면 하나라도 일치하는 학회를
                              표시합니다.
                            </p>
                          </div>
                          {selectedCategories.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-[#2F6B3F]"
                              onClick={() => setSelectedCategories([])}
                            >
                              전체 해제
                            </Button>
                          )}
                        </div>
                      </PopoverHeader>
                      <div className="max-h-80 overflow-y-auto p-2">
                        {categories.map((item, index) => {
                          const checked = selectedCategories.includes(item);
                          return (
                            <label
                              key={item}
                              htmlFor={`acm-ccs-${index}`}
                              className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-[#405047] transition hover:bg-[#7FB77E]/12"
                            >
                              <Checkbox
                                id={`acm-ccs-${index}`}
                                checked={checked}
                                onCheckedChange={(value) =>
                                  toggleCategory(item, value)
                                }
                                className="border-[#7FB77E] data-checked:border-[#2F6B3F] data-checked:bg-[#2F6B3F]"
                              />
                              <span className="leading-5">{item}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="border-t border-[#2F6B3F]/10 bg-[#FFF9DA] px-4 py-2 text-xs text-[#68746B]">
                        {selectedCategories.length === 0
                          ? '모든 분야가 표시됩니다.'
                          : `${selectedCategories.length}개 분야를 OR 조건으로 적용 중입니다.`}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <NativeSelect
                    className="w-full sm:w-auto"
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    aria-label="지역"
                  >
                    <NativeSelectOption value="전체 지역">
                      국내 + 해외
                    </NativeSelectOption>
                    <NativeSelectOption value="국내">국내</NativeSelectOption>
                    <NativeSelectOption value="해외">해외</NativeSelectOption>
                  </NativeSelect>
                  <NativeSelect
                    className="w-full sm:w-auto"
                    value={format}
                    onChange={(event) => setFormat(event.target.value)}
                    aria-label="개최 방식"
                  >
                    <NativeSelectOption value="전체 방식">
                      전체 개최 방식
                    </NativeSelectOption>
                    <NativeSelectOption value="온라인">
                      온라인
                    </NativeSelectOption>
                    <NativeSelectOption value="오프라인">
                      오프라인
                    </NativeSelectOption>
                    <NativeSelectOption value="하이브리드">
                      하이브리드
                    </NativeSelectOption>
                  </NativeSelect>
                  <Button
                    variant={pinnedOnly ? 'default' : 'outline'}
                    className={`h-8 gap-2 ${pinnedOnly ? 'bg-[#2F6B3F] text-white' : 'border-[#2F6B3F]/15 bg-white text-[#405047]'}`}
                    onClick={() => setPinnedOnly(!pinnedOnly)}
                  >
                    <Bookmark className="size-3.5" /> 관심 학회만
                  </Button>
                </div>
                <span className="ml-auto text-sm text-[#6C786F]">
                  <strong className="text-[#2F6B3F]">{filtered.length}</strong>
                  개 학회
                </span>
                {(query ||
                  selectedCategories.length > 0 ||
                  region !== '전체 지역' ||
                  format !== '전체 방식' ||
                  pinnedOnly) && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    초기화
                  </Button>
                )}
              </div>
            </div>

            {view === 'calendar' ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#2F6B3F]/12 bg-white shadow-[0_16px_45px_rgba(47,107,63,0.08)]">
                <div className="grid grid-cols-7 border-b border-[#2F6B3F]/10 bg-[#FFF9DA]">
                  {weekDays.map((day, index) => (
                    <div
                      key={day}
                      className={`px-2 py-3 text-center text-xs font-bold ${index === 0 ? 'text-[#B75743]' : index === 6 ? 'text-[#39718C]' : 'text-[#58665C]'}`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, index) => {
                    const events = calendarEvents.filter(
                      ({ milestone }) =>
                        Number(milestone.eventAt.slice(8, 10)) === day,
                    );
                    const valid = day >= 1 && day <= 30;
                    const today = day === currentCalendarDay;
                    return (
                      <div
                        key={`${day}-${index}`}
                        className={`min-h-28 border-b border-r border-[#2F6B3F]/8 p-1.5 sm:min-h-32 sm:p-2 ${!valid ? 'bg-[#FBFBF7]' : 'bg-white'} ${(index + 1) % 7 === 0 ? 'border-r-0' : ''}`}
                      >
                        {valid && (
                          <div className="mb-1.5 flex items-center justify-between">
                            <span
                              className={`grid size-6 place-items-center rounded-full text-xs font-bold ${today ? 'bg-[#F7C85C] text-[#4F3C0F]' : 'text-[#59665D]'}`}
                            >
                              {day}
                            </span>
                            {events.some(({ conference }) =>
                              pinnedIds.includes(conference.id),
                            ) && (
                              <BookmarkCheck className="size-3.5 fill-[#F7C85C] text-[#A9780B]" />
                            )}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {events.map(({ conference, milestone }) => (
                            <EventPill
                              key={`${conference.id}-${milestone.id}`}
                              conference={conference}
                              milestone={milestone}
                              onSelect={setSelectedEvent}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {calendarEvents.map(({ conference, milestone }) => (
                  <button
                    type="button"
                    key={`${conference.id}-${milestone.id}`}
                    onClick={() =>
                      setSelectedEvent({
                        conferenceId: conference.id,
                        milestoneId: milestone.id,
                      })
                    }
                    className="group flex w-full flex-col gap-4 rounded-2xl border border-[#2F6B3F]/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#7FB77E] hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <div className="grid min-h-14 min-w-16 shrink-0 place-items-center rounded-2xl bg-[#FFF6C0] px-3 text-center text-sm font-black text-[#2F6B3F]">
                      {dDayLabel(milestone.dDay)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-black text-[#204F31]">
                          {conference.acronym}
                        </h2>
                        <Badge
                          variant="outline"
                          className="border-[#7FB77E]/40 text-[#4E6D54]"
                        >
                          {conference.category}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-[#5D6960]">
                        {milestoneLabel(milestone)}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm font-bold">
                        {formatDate(milestone, true)}
                      </p>
                      <p className="mt-1 text-xs text-[#778179]">
                        {milestone.originalTimezone}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="mt-5 rounded-2xl border border-dashed border-[#7FB77E] bg-white px-6 py-16 text-center">
                <Search className="mx-auto size-8 text-[#7FB77E]" />
                <h2 className="mt-4 font-bold">조건에 맞는 학회가 없습니다</h2>
                <p className="mt-1 text-sm text-[#6D786F]">
                  필터를 줄이거나 검색어를 바꿔보세요.
                </p>
                <Button className="mt-5 bg-[#2F6B3F]" onClick={resetFilters}>
                  필터 초기화
                </Button>
              </div>
            )}
            <p className="mt-4 text-center text-xs text-[#879087]">
              현재 화면의 일정은 기능 확인을 위한 예시 데이터입니다.
            </p>
          </section>
        </main>
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <SheetContent className="border-[#2F6B3F]/14 bg-[#FFFDF5] data-[side=right]:w-[96vw] data-[side=right]:max-w-none data-[side=right]:sm:w-[80vw] data-[side=right]:sm:max-w-none data-[side=right]:lg:w-[50vw] data-[side=right]:lg:max-w-[64rem]">
          {selected && selectedMilestone && (
            <>
              <SheetHeader className="border-b border-[#2F6B3F]/10 px-6 pb-5 pt-8">
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="bg-[#F7C85C] text-[#4B3910] hover:bg-[#F7C85C]">
                    {dDayLabel(selectedMilestone.dDay)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-[#7FB77E]/40 text-[#4D6C53]"
                  >
                    {selected.category}
                  </Badge>
                </div>
                <SheetTitle className="pr-8 text-2xl font-black tracking-[-0.03em] text-[#183E28]">
                  {selected.acronym}
                </SheetTitle>
                <SheetDescription className="mt-1 leading-6 text-[#647068]">
                  {selected.name}
                </SheetDescription>
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                  {selected.links.map((link) => (
                    <a
                      key={`${link.label}-${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2F6B3F] underline decoration-[#7FB77E]/55 underline-offset-4 hover:text-[#204F31]"
                    >
                      {link.label}
                      <ExternalLink className="size-3" />
                    </a>
                  ))}
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <Button
                  className={`mb-6 h-11 w-full gap-2 ${pinnedIds.includes(selected.id) ? 'bg-[#F7C85C] text-[#44340E] hover:bg-[#E8B642]' : 'bg-[#2F6B3F] text-white'}`}
                  onClick={() => void togglePin(selected.id)}
                >
                  {pinnedIds.includes(selected.id) ? (
                    <BookmarkCheck />
                  ) : (
                    <Bookmark />
                  )}
                  {pinnedIds.includes(selected.id)
                    ? '관심 학회에서 제거'
                    : '관심 학회로 저장'}
                </Button>
                <div className="rounded-2xl border border-[#E7BC51]/35 bg-[#FFF6C0] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8A681A]">
                    선택한 일정
                  </p>
                  <p className="mt-2 text-lg font-black text-[#3E3111]">
                    {milestoneLabel(selectedMilestone)}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-[#675522]">
                    <Clock3 className="size-4" />{' '}
                    {formatDate(selectedMilestone)} (
                    {selectedMilestone.originalTimezone})
                  </div>
                </div>
                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 size-4 text-[#2F6B3F]" />
                    <div>
                      <p className="font-bold">개최 장소</p>
                      <p className="mt-1 text-[#6A756C]">
                        {selected.location} · {selected.format}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 size-4 text-[#2F6B3F]" />
                    <div>
                      <p className="font-bold">연구 분야</p>
                      <p className="mt-1 text-[#6A756C]">{selected.category}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 border-t border-[#2F6B3F]/10 pt-5">
                  <h3 className="font-black">학회 소개</h3>
                  <p className="mt-2 text-sm leading-6 text-[#667168]">
                    {selected.description}
                  </p>
                </div>
                <div className="mt-6 border-t border-[#2F6B3F]/10 pt-5">
                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <h3 className="font-black">전체 일정</h3>
                      <p className="mt-1 text-xs text-[#748078]">
                        학회가 발표한 공식 명칭과 시간순으로 표시합니다.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#2F6B3F]">
                      {selected.milestones.length}개
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-[#2F6B3F]/10 bg-white">
                    <div className="hidden grid-cols-[minmax(0,1fr)_8.75rem_4.5rem] gap-3 bg-[#FFF9DA] px-4 py-2 text-xs font-bold text-[#657067] sm:grid">
                      <span className="min-w-0">공식 일정</span>
                      <span className="min-w-0">기한</span>
                      <span className="text-right">D-Day</span>
                    </div>
                    <div className="divide-y divide-[#2F6B3F]/8">
                      {selected.milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className={`grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_8.75rem_4.5rem] sm:items-center sm:gap-3 ${milestone.id === selectedMilestone.id ? 'bg-[#FFF6C0]/60' : ''}`}
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold leading-5 text-[#294432]">
                              {milestoneLabel(milestone)}
                            </p>
                            <p className="mt-0.5 text-xs text-[#7B867E] sm:hidden">
                              {formatDate(milestone)} ·{' '}
                              {milestone.originalTimezone}
                            </p>
                          </div>
                          <p className="hidden min-w-0 text-xs leading-5 text-[#667168] sm:block">
                            <span className="whitespace-nowrap">
                              {formatDeadlineDate(milestone)}
                            </span>
                            <br />
                            <span className="whitespace-nowrap text-[#899188]">
                              {formatDeadlineTime(milestone)}
                            </span>
                          </p>
                          <Badge
                            variant="outline"
                            className={`w-fit whitespace-nowrap justify-self-start text-xs font-black sm:justify-self-end ${milestone.dDay < 0 ? 'border-[#2F6B3F]/15 bg-[#F2F4EF] text-[#758078]' : milestone.dDay === 0 ? 'border-[#E2AD36] bg-[#F7C85C] text-[#4B3910]' : 'border-[#7FB77E]/40 bg-[#7FB77E]/10 text-[#2F6B3F]'}`}
                          >
                            {dDayLabel(milestone.dDay)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
