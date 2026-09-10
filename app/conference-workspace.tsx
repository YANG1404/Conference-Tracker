'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
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
  LibraryBig,
  LayoutGrid,
  List,
  LogIn,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

import { displayDay, dayDifference, monthGrid } from '@/lib/schedule-time';

type Milestone = {
  id: number;
  type: string;
  groupName: string | null;
  title: string;
  eventAt: string;
  endAt: string | null;
  sourceUrl: string | null;
  originalTimezone: string;
  timeConfirmed: boolean;
  dDay: number;
};

type Conference = {
  id: number;
  acronym: string;
  editionYear: number | null;
  name: string;
  category: string;
  categories: string[];
  format: '온라인' | '오프라인' | '하이브리드' | '미확인';
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
  end_at: string | null;
  source_url: string | null;
  original_timezone: string;
  time_confirmed: boolean;
  d_day: number;
};

type ApiConference = {
  id: number;
  acronym: string | null;
  edition_year: number | null;
  name: string;
  description: string | null;
  country_code: string;
  city: string | null;
  format: 'ONSITE' | 'ONLINE' | 'HYBRID' | 'UNKNOWN';
  research_fields: Array<{ name_ko: string }>;
  milestones: ApiMilestone[];
  links: Array<{ label: string; url: string }>;
};

type SelectedEvent = { conferenceId: number; milestoneId: number };

function conferenceLabel(conference: Conference) {
  if (
    !conference.editionYear ||
    conference.acronym.includes(String(conference.editionYear))
  )
    return conference.acronym;
  return `${conference.acronym} ${conference.editionYear}`;
}

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
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

const dayOffset = dayDifference;

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
        timeZone: milestone.timeConfirmed ? 'Asia/Seoul' : 'UTC',
      }
    : {
        year: compact ? undefined : 'numeric',
        month: compact ? 'numeric' : 'long',
        day: 'numeric',
        timeZone: milestone.timeConfirmed ? 'Asia/Seoul' : 'UTC',
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
    timeZone: milestone.timeConfirmed ? 'Asia/Seoul' : 'UTC',
  }).format(new Date(milestone.eventAt));
}

function formatDeadlineTime(milestone: Milestone) {
  if (!milestone.timeConfirmed) return '시각 미정 · 원본 날짜';

  const time = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: milestone.timeConfirmed ? 'Asia/Seoul' : 'UTC',
  }).format(new Date(milestone.eventAt));

  return `${time} KST · 원본 ${milestone.originalTimezone}`;
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
        {conferenceLabel(conference)}
      </span>
      <span className="mt-0.5 hidden truncate text-[0.68rem] opacity-85 xl:block">
        {milestoneLabel(milestone)}
      </span>
    </button>
  );
}

export function ConferenceWorkspace({
  userName,
  userEmail,
  userImage,
  isAuthenticated,
  isAdmin,
  initialConferenceId,
  initialYear,
  initialMonth,
}: {
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  initialConferenceId: number | null;
  initialYear: number;
  initialMonth: number;
}) {
  const [conferenceItems, setConferenceItems] = useState<Conference[]>([]);
  const [calendarMonth, setCalendarMonth] = useState({
    year: initialYear,
    month: initialMonth,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const openedInitial = useRef(false);
  const { year, month } = calendarMonth;
  const calendarDays = monthGrid(year, month);
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = calendarDays.filter((day) => day.valid).at(-1)!.date;
  function goMonth(nextYear: number, nextMonth: number) {
    const date = new Date(Date.UTC(nextYear, nextMonth - 1, 1));
    if (date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2100) return;
    setCalendarMonth({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
    });
    setSelectedEvent(null);
    setExpandedDays([]);
    const url = new URL(window.location.href);
    url.searchParams.set('year', String(date.getUTCFullYear()));
    url.searchParams.set('month', String(date.getUTCMonth() + 1));
    window.history.replaceState(null, '', url);
  }
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [format, setFormat] = useState('전체 방식');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(
    null,
  );
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [mobileFilters, setMobileFilters] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [loginReturnConferenceId, setLoginReturnConferenceId] = useState<
    number | null
  >(null);
  const todayDate = displayDay(new Date().toISOString());

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return conferenceItems.filter((conference) => {
      const matchesQuery =
        !normalized ||
        conference.acronym.toLowerCase().includes(normalized) ||
        conference.name.toLowerCase().includes(normalized);
      const matchesCategory =
        selectedCategories.length === 0 ||
        conference.categories.some((category) =>
          selectedCategories.includes(category),
        );
      const matchesFormat =
        format === '전체 방식' || conference.format === format;
      const matchesPinned = !pinnedOnly || pinnedIds.includes(conference.id);
      return (
        matchesQuery &&
        matchesCategory &&
        matchesFormat &&
        matchesPinned
      );
    });
  }, [
    query,
    selectedCategories,
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
            .filter(
              (milestone) =>
                displayDay(milestone.eventAt, milestone.timeConfirmed) <=
                  monthEnd &&
                displayDay(
                  milestone.endAt || milestone.eventAt,
                  milestone.timeConfirmed,
                ) >= monthStart,
            )
            .map((milestone) => ({ conference, milestone })),
        )
        .sort((a, b) => a.milestone.eventAt.localeCompare(b.milestone.eventAt)),
    [filtered, monthStart, monthEnd],
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
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setLoadError('');
      setConferenceItems([]);
    }, 0);
    fetch(
      `/api/v1/conferences/calendar?date_from=${monthStart}&date_to=${monthEnd}`,
      { signal: controller.signal },
    )
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { items: ApiConference[] })
          : Promise.reject(
              new Error('일정을 불러오지 못했습니다. 다시 시도해주세요.'),
            ),
      )
      .then(async (data) => {
        if (
          data &&
          initialConferenceId &&
          !openedInitial.current &&
          !data.items.some((item) => item.id === initialConferenceId)
        ) {
          const detail = await fetch(
            '/api/v1/conferences/' + initialConferenceId,
            { signal: controller.signal },
          );
          if (detail.ok)
            data.items.push((await detail.json()) as ApiConference);
        }
        return data;
      })
      .then((data) => {
        if (!data || controller.signal.aborted) return;
        const tones: Conference['tone'][] = ['green', 'mint', 'gold'];
        setConferenceItems(
          data.items.map((item, index) => {
            const categoryName =
              item.research_fields?.[0]?.name_ko ?? '분야 미지정';
            return {
              id: item.id,
              acronym: item.acronym ?? item.name,
              editionYear: item.edition_year,
              name: item.name,
              category: categoryName,
              categories: item.research_fields.map((field) => field.name_ko),
              format:
                item.format === 'UNKNOWN'
                  ? '미확인'
                  : item.format === 'ONLINE'
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
                endAt: milestone.end_at,
                sourceUrl: milestone.source_url,
                originalTimezone: milestone.original_timezone,
                timeConfirmed: milestone.time_confirmed,
                dDay: milestone.d_day ?? dayOffset(milestone.event_at),
              })),
              tone: tones[index % tones.length],
            } satisfies Conference;
          }),
        );
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setLoadError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [monthStart, monthEnd, retry, initialConferenceId]);

  useEffect(() => {
    if (isAuthenticated) {
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
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!initialConferenceId || openedInitial.current) return;
    const conference = conferenceItems.find(
      (item) => item.id === initialConferenceId,
    );
    const milestone = conference?.milestones[0];
    if (!conference || !milestone) return;
    openedInitial.current = true;
    const timeout = window.setTimeout(
      () =>
        setSelectedEvent({
          conferenceId: conference.id,
          milestoneId: milestone.id,
        }),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, [conferenceItems, initialConferenceId, selectedEvent]);

  const togglePin = async (id: number) => {
    if (!isAuthenticated) {
      setLoginReturnConferenceId(id);
      setLoginPromptOpen(true);
      return;
    }
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
            if (!isAuthenticated)
              throw new Error(
                '관심 학회를 저장하려면 Google 로그인이 필요합니다.',
              );
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
  }, [isAuthenticated]);

  const resetFilters = () => {
    setQuery('');
    setSelectedCategories([]);
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
                Major CS conference calendar
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto hidden text-[#2F6B3F] sm:inline-flex"
            onClick={() => window.location.assign('/catalog')}
          >
            <LibraryBig /> 학회 카탈로그
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full border-[#2F6B3F]/12 bg-white py-1.5 pl-1.5 pr-2 shadow-none hover:bg-[#F5FAF2] sm:pr-3"
                  aria-label="계정 메뉴 열기"
                />
              }
            >
              {userImage ? (
                <span
                  className="size-8 shrink-0 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${userImage})` }}
                />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#7FB77E] text-sm font-bold text-white">
                  {(userName ?? 'G').slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-40 truncate text-sm font-semibold sm:block">
                {userName ?? '로그인'}
              </span>
              <ChevronDown className="size-3.5 text-[#627066]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-64 border border-[#2F6B3F]/12 bg-[#FFFDF7] p-2"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2 py-2">
                  <span className="block truncate text-sm font-bold text-[#294432]">
                    {userName ?? '비회원으로 이용 중'}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal text-[#748078]">
                    {isAuthenticated
                      ? userEmail
                      : '학회 검색과 일정 확인이 가능합니다.'}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              {!isAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    render={
                      <button
                        type="button"
                        aria-label="Google 로그인 페이지 열기"
                        onClick={() =>
                          window.location.assign('/login?return_to=%2F')
                        }
                      />
                    }
                    className="px-2.5 py-2.5 font-semibold text-[#294432] focus:bg-[#7FB77E]/15"
                  >
                    <LogIn className="text-[#2F6B3F]" /> Google로 로그인
                  </DropdownMenuItem>
                </>
              )}
              {isAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    render={
                      <button
                        type="button"
                        aria-label="내 정보 페이지 열기"
                        onClick={() => window.location.assign('/me')}
                      />
                    }
                    className="px-2.5 py-2.5 font-semibold text-[#294432] focus:bg-[#7FB77E]/15"
                  >
                    <UserRound className="text-[#2F6B3F]" /> 내 정보
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={
                      <button
                        type="button"
                        aria-label="관심 학회 목록 열기"
                        onClick={() => window.location.assign('/me#interests')}
                      />
                    }
                    className="px-2.5 py-2.5 font-semibold text-[#294432] focus:bg-[#7FB77E]/15"
                  >
                    <Bookmark className="text-[#2F6B3F]" /> 관심 학회
                  </DropdownMenuItem>
                </>
              )}
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
              {isAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    render={
                      <button
                        type="button"
                        aria-label="로그아웃"
                        onClick={async () => {
                          await fetch('/api/auth/logout', { method: 'POST' });
                          window.location.assign('/');
                        }}
                      />
                    }
                    className="px-2.5 py-2.5 font-semibold text-[#6B3F34] focus:bg-[#F7C85C]/15"
                  >
                    <LogOut /> 로그아웃
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
                    {year}년 {month}월
                  </Badge>
                  <span className="text-xs text-[#748078]">
                    한국 시간(KST) · 날짜만 있는 일정은 원본 기준
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-[-0.035em] text-[#183E28] sm:text-3xl">
                  주요 CS 국제학회 일정을 한눈에
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#68746B] sm:text-base">
                  컴퓨터과학 분야의 주요 국제학회가 발표한 공식 일정을
                  확인할 수 있습니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    goMonth(
                      Number(todayDate.slice(0, 4)),
                      Number(todayDate.slice(5, 7)),
                    )
                  }
                >
                  오늘
                </Button>
                <div className="flex items-center rounded-xl border border-[#2F6B3F]/12 bg-white p-1 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="이전 달"
                    onClick={() => goMonth(year, month - 1)}
                    className="text-[#2F6B3F]"
                  >
                    <ChevronLeft />
                  </Button>
                  <input
                    aria-label="연도와 월 선택"
                    type="month"
                    min="1900-01"
                    max="2100-12"
                    value={monthStart.slice(0, 7)}
                    onChange={(event) => {
                      const [y, m] = event.target.value.split('-').map(Number);
                      if (y && m) goMonth(y, m);
                    }}
                    className="w-36 bg-transparent px-2 text-sm font-bold"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="다음 달"
                    onClick={() => goMonth(year, month + 1)}
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
                    onClick={() => {
                      if (!isAuthenticated) {
                        setLoginPromptOpen(true);
                        return;
                      }
                      setPinnedOnly(!pinnedOnly);
                    }}
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
                  format !== '전체 방식' ||
                  pinnedOnly) && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    초기화
                  </Button>
                )}
              </div>
            </div>

            {loading && (
              <output className="mt-5 block text-sm">
                일정을 불러오는 중입니다…
              </output>
            )}
            {loadError && (
              <div role="alert" className="mt-5 rounded-xl bg-amber-50 p-4">
                {loadError}{' '}
                <Button
                  variant="outline"
                  onClick={() => setRetry((n) => n + 1)}
                >
                  다시 시도
                </Button>
              </div>
            )}
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
                  {calendarDays.map(({ day, valid, date }, index) => {
                    const events = calendarEvents.filter(
                      ({ milestone }) =>
                        valid &&
                        displayDay(
                          milestone.eventAt,
                          milestone.timeConfirmed,
                        ) <= date &&
                        displayDay(
                          milestone.endAt || milestone.eventAt,
                          milestone.timeConfirmed,
                        ) >= date,
                    );
                    const today = date === todayDate;
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
                          {(expandedDays.includes(date)
                            ? events
                            : events.slice(0, 3)
                          ).map(({ conference, milestone }) => (
                            <EventPill
                              key={`${conference.id}-${milestone.id}`}
                              conference={conference}
                              milestone={milestone}
                              onSelect={setSelectedEvent}
                            />
                          ))}
                          {events.length > 3 && (
                            <button
                              type="button"
                              className="text-xs font-bold text-[#2F6B3F]"
                              onClick={() =>
                                setExpandedDays((days) =>
                                  days.includes(date)
                                    ? days.filter((d) => d !== date)
                                    : [...days, date],
                                )
                              }
                            >
                              {expandedDays.includes(date)
                                ? '접기'
                                : `+${events.length - 3}개 더 보기`}
                            </button>
                          )}
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
                          {conferenceLabel(conference)}
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
                        {milestone.timeConfirmed
                          ? `KST · 원본 ${milestone.originalTimezone}`
                          : '원본 날짜 · 시각 미정'}
                        {milestone.endAt
                          ? ` ~ ${displayDay(milestone.endAt, milestone.timeConfirmed)}`
                          : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && !loadError && calendarEvents.length === 0 && (
              <div className="mt-5 rounded-2xl border border-dashed border-[#7FB77E] bg-white px-6 py-16 text-center">
                <Search className="mx-auto size-8 text-[#7FB77E]" />
                <h2 className="mt-4 font-bold">
                  이 달에 조건에 맞는 공개 일정이 없습니다
                </h2>
                <p className="mt-1 text-sm text-[#6D786F]">
                  다른 달로 이동하거나 필터를 변경하세요. 수집 전·미공개 일정은
                  표시되지 않습니다.
                </p>
                <Button className="mt-5 bg-[#2F6B3F]" onClick={resetFilters}>
                  필터 초기화
                </Button>
              </div>
            )}
            <p className="mt-4 text-center text-xs text-[#879087]">
              공개된 수집 일정만 표시합니다. 최종 마감일은 학회 공식
              홈페이지에서 확인하세요.
            </p>
          </section>
        </main>
      </div>

      <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <DialogContent className="border-[#2F6B3F]/14 bg-[#FFFDF7] p-6 sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-[#7FB77E]/18 text-[#2F6B3F]">
              <Bookmark className="size-5" />
            </div>
            <DialogTitle className="text-xl font-black text-[#204F31]">
              Google 로그인이 필요합니다
            </DialogTitle>
            <DialogDescription className="leading-6 text-[#68746B]">
              관심 학회를 저장하고 관리하려면 로그인해 주세요. 학회 검색과 일정
              확인은 로그인 없이 계속 이용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-[#2F6B3F]/10 bg-[#FFF9DA]/45">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLoginPromptOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              className="bg-[#2F6B3F] text-white hover:bg-[#245632]"
              onClick={() => {
                const returnTo = loginReturnConferenceId
                  ? `/?conference=${loginReturnConferenceId}&year=${year}&month=${month}`
                  : '/';
                window.location.assign(
                  `/login?return_to=${encodeURIComponent(returnTo)}`,
                );
              }}
            >
              <LogIn /> Google로 로그인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {conferenceLabel(selected)}
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
                    {selectedMilestone.timeConfirmed
                      ? `KST · 원본 ${selectedMilestone.originalTimezone}`
                      : '원본 날짜 · 시각 미정'}
                    )
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
                            {milestone.sourceUrl && (
                              <a
                                href={milestone.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[#2F6B3F] underline"
                              >
                                출처 확인
                              </a>
                            )}
                            <p className="mt-0.5 text-xs text-[#7B867E] sm:hidden">
                              {formatDate(milestone)} ·{' '}
                              {milestone.timeConfirmed ? 'KST' : '원본 날짜'}
                            </p>
                          </div>
                          <p className="hidden min-w-0 text-xs leading-5 text-[#667168] sm:block">
                            <span className="whitespace-nowrap">
                              {formatDeadlineDate(milestone)}
                              {milestone.endAt
                                ? ` ~ ${displayDay(milestone.endAt, milestone.timeConfirmed)}`
                                : ''}
                            </span>
                            <br />
                            <span className="break-words text-[#899188]">
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
