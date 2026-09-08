'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Menu,
  Search,
  Settings2,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type Conference = {
  id: number;
  acronym: string;
  name: string;
  date: number;
  milestone: string;
  category: string;
  region: '국내' | '해외';
  format: '온라인' | '오프라인' | '하이브리드';
  location: string;
  deadline: string;
  timezone: string;
  description: string;
  links: { label: string; url: string }[];
  tone: 'green' | 'gold' | 'mint';
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
  milestones: Array<{ event_at: string; title: string | null; original_timezone: string }>;
  next_milestone: { event_at: string; title: string | null; original_timezone: string } | null;
  links: Array<{ label: string; url: string }>;
};

const demoConferences: Conference[] = [
  {
    id: 1,
    acronym: 'CHI 2027',
    name: 'ACM Conference on Human Factors in Computing Systems',
    date: 3,
    milestone: '초록 제출 마감',
    category: 'HCI',
    region: '해외',
    format: '오프라인',
    location: 'Barcelona, Spain',
    deadline: '2026. 9. 3. 오후 11:59',
    timezone: 'AoE',
    description: '사람과 컴퓨팅 기술의 상호작용을 다루는 국제 학술대회입니다.',
    links: [
      { label: '공식 홈페이지', url: 'https://chi2027.acm.org/' },
      { label: '논문 제출', url: 'https://new.precisionconference.com/' },
    ],
    tone: 'green',
  },
  {
    id: 2,
    acronym: 'KSC 2026',
    name: '한국소프트웨어종합학술대회',
    date: 8,
    milestone: '논문 제출 시작',
    category: '소프트웨어',
    region: '국내',
    format: '오프라인',
    location: '대한민국, 제주',
    deadline: '2026. 9. 8. 오전 9:00',
    timezone: 'Asia/Seoul',
    description: '컴퓨팅 전 분야의 연구 성과를 공유하는 국내 종합 학술대회입니다.',
    links: [{ label: '공식 홈페이지', url: 'https://www.kiise.or.kr/' }],
    tone: 'mint',
  },
  {
    id: 3,
    acronym: 'AAAI 2027',
    name: 'AAAI Conference on Artificial Intelligence',
    date: 12,
    milestone: '논문 제출 마감',
    category: '인공지능',
    region: '해외',
    format: '하이브리드',
    location: 'Vancouver, Canada',
    deadline: '2026. 9. 12. 오후 11:59',
    timezone: 'UTC-12 (AoE)',
    description: '인공지능 이론과 응용 전반의 최신 연구를 다루는 국제 학술대회입니다.',
    links: [
      { label: '공식 홈페이지', url: 'https://aaai.org/' },
      { label: 'Call for Papers', url: 'https://aaai.org/conference/' },
    ],
    tone: 'gold',
  },
  {
    id: 4,
    acronym: 'ICSE 2027',
    name: 'International Conference on Software Engineering',
    date: 18,
    milestone: '채택 결과 발표',
    category: '소프트웨어',
    region: '해외',
    format: '오프라인',
    location: 'Seoul, Korea',
    deadline: '2026. 9. 18. 오후 5:00',
    timezone: 'UTC',
    description: '소프트웨어 공학 분야의 연구와 산업 사례를 공유하는 국제 학술대회입니다.',
    links: [{ label: '공식 홈페이지', url: 'https://conf.researchr.org/' }],
    tone: 'green',
  },
  {
    id: 5,
    acronym: 'NeurIPS 2026',
    name: 'Conference on Neural Information Processing Systems',
    date: 22,
    milestone: '저자 등록 마감',
    category: '머신러닝',
    region: '해외',
    format: '하이브리드',
    location: 'San Diego, USA',
    deadline: '2026. 9. 22. 오후 11:59',
    timezone: 'AoE',
    description: '머신러닝과 계산 신경과학 분야의 연구를 폭넓게 다루는 학술대회입니다.',
    links: [{ label: '공식 홈페이지', url: 'https://neurips.cc/' }],
    tone: 'gold',
  },
  {
    id: 6,
    acronym: 'UIST 2026',
    name: 'ACM Symposium on User Interface Software and Technology',
    date: 25,
    milestone: '카메라 레디 마감',
    category: 'HCI',
    region: '해외',
    format: '오프라인',
    location: 'Busan, Korea',
    deadline: '2026. 9. 25. 오후 11:59',
    timezone: 'AoE',
    description: '사용자 인터페이스 기술과 상호작용 기법을 다루는 국제 심포지엄입니다.',
    links: [{ label: '공식 홈페이지', url: 'https://uist.acm.org/' }],
    tone: 'mint',
  },
];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
const calendarDays = Array.from({ length: 35 }, (_, index) => index - 1);
const categories = ['전체 분야', '인공지능', '머신러닝', 'HCI', '소프트웨어'];

function EventPill({ conference, onSelect }: { conference: Conference; onSelect: (conference: Conference) => void }) {
  const tone = {
    green: 'border-[#2F6B3F]/20 bg-[#2F6B3F] text-white',
    gold: 'border-[#E2AD36] bg-[#F7C85C] text-[#29342B]',
    mint: 'border-[#6AA56B] bg-[#7FB77E] text-[#173B25]',
  }[conference.tone];

  return (
    <button type="button" onClick={() => onSelect(conference)} className={`group w-full rounded-md border px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tone}`}>
      <span className="block truncate text-[0.72rem] font-bold leading-tight">{conference.acronym}</span>
      <span className="mt-0.5 hidden truncate text-[0.68rem] opacity-80 xl:block">{conference.milestone}</span>
    </button>
  );
}

export function ConferenceWorkspace({ userName }: { userName: string | null }) {
  const [conferenceItems, setConferenceItems] = useState<Conference[]>(demoConferences);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체 분야');
  const [region, setRegion] = useState('전체 지역');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<Conference | null>(null);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [mobileFilters, setMobileFilters] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return conferenceItems.filter((conference) => {
      const matchesQuery = !normalized || conference.acronym.toLowerCase().includes(normalized) || conference.name.toLowerCase().includes(normalized);
      const matchesCategory = category === '전체 분야' || conference.category === category;
      const matchesRegion = region === '전체 지역' || conference.region === region;
      const matchesPinned = !pinnedOnly || pinnedIds.includes(conference.id);
      return matchesQuery && matchesCategory && matchesRegion && matchesPinned;
    });
  }, [query, category, region, pinnedOnly, pinnedIds, conferenceItems]);

  useEffect(() => {
    fetch('/api/v1/conferences')
      .then(async (response) => response.ok ? await response.json() as { items: ApiConference[] } : null)
      .then((data: { items: ApiConference[] } | null) => {
        if (!data?.items?.length) return;
        const tones: Conference['tone'][] = ['green', 'mint', 'gold'];
        setConferenceItems(data.items.map((item, index) => {
          const milestone = item.next_milestone ?? item.milestones?.[0];
          const fieldName = item.research_fields?.[0]?.name_ko ?? '컴퓨팅';
          const categoryName = fieldName.includes('인간') ? 'HCI' : fieldName.includes('소프트웨어') ? '소프트웨어' : item.acronym?.includes('AAAI') ? '인공지능' : '머신러닝';
          const formatName = item.format === 'ONLINE' ? '온라인' : item.format === 'HYBRID' ? '하이브리드' : '오프라인';
          return {
            id: item.id,
            acronym: item.acronym ?? item.name,
            name: item.name,
            date: milestone ? new Date(milestone.event_at).getUTCDate() : 1,
            milestone: milestone?.title ?? '일정 미정',
            category: categoryName,
            region: item.is_domestic ? '국내' : '해외',
            format: formatName,
            location: [item.city, item.country_code].filter(Boolean).join(', '),
            deadline: milestone ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(milestone.event_at)) : '미정',
            timezone: milestone?.original_timezone ?? 'UTC',
            description: item.description ?? '학회 상세 설명이 준비 중입니다.',
            links: item.links.map((link) => ({ label: link.label, url: link.url })),
            tone: tones[index % tones.length],
          } satisfies Conference;
        }));
      })
      .catch(() => undefined);

    fetch('/api/v1/me/pins')
      .then(async (response) => response.ok ? await response.json() as { items: Array<{ conference_id: number }> } : null)
      .then((data: { items: Array<{ conference_id: number }> } | null) => {
        if (data?.items) setPinnedIds(data.items.map((pin: { conference_id: number }) => pin.conference_id));
      })
      .catch(() => undefined);
  }, []);

  const togglePin = async (id: number) => {
    const isPinned = pinnedIds.includes(id);
    setPinnedIds((current) => isPinned ? current.filter((item) => item !== id) : [...current, id]);
    const response = await fetch(`/api/v1/me/pins/${id}`, { method: isPinned ? 'DELETE' : 'PUT' });
    if (!response.ok) {
      setPinnedIds((current) => isPinned ? [...current, id] : current.filter((item) => item !== id));
    }
  };

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'set_conference_pin',
      title: '관심 학회 설정',
      description: 'Conference Tracker에서 지정한 학회를 관심 학회로 저장하거나 해제합니다.',
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
        if (!input || typeof input !== 'object') throw new Error('입력 형식이 올바르지 않습니다.');
        const { conference_id, pinned } = input as { conference_id?: unknown; pinned?: unknown };
        if (!Number.isInteger(conference_id) || Number(conference_id) < 1 || typeof pinned !== 'boolean') throw new Error('conference_id와 pinned 값을 확인해 주세요.');
        const id = Number(conference_id);
        const response = await fetch(`/api/v1/me/pins/${id}`, { method: pinned ? 'PUT' : 'DELETE' });
        if (!response.ok) throw new Error('관심 학회 변경에 실패했습니다.');
        setPinnedIds((current) => pinned ? [...new Set([...current, id])] : current.filter((item) => item !== id));
        return { conference_id: id, pinned };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const resetFilters = () => {
    setQuery('');
    setCategory('전체 분야');
    setRegion('전체 지역');
    setPinnedOnly(false);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF2] text-[#203126]">
      <header className="sticky top-0 z-40 border-b border-[#2F6B3F]/10 bg-[#FFFDF2]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-fit items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#2F6B3F] text-[#FFF6C0] shadow-[0_7px_18px_rgba(47,107,63,0.24)]"><CalendarDays className="size-5" /></div>
            <div>
              <p className="font-extrabold tracking-[-0.02em] text-[#204F31]">Conference Tracker</p>
              <p className="text-xs text-[#607064]">Computing conference calendar</p>
            </div>
          </div>

          <div className="relative ml-auto hidden w-full max-w-xl md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6A786D]" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="학회명 또는 약어 검색" aria-label="학회 검색" className="h-10 rounded-xl border-[#2F6B3F]/15 bg-white pl-10 shadow-sm placeholder:text-[#8C978E] focus-visible:border-[#2F6B3F] focus-visible:ring-[#7FB77E]/30" />
          </div>

          <Button variant="ghost" size="icon-lg" aria-label="알림" className="ml-auto text-[#2F6B3F] md:ml-0"><Bell /></Button>
          <div className="hidden items-center gap-2 rounded-full border border-[#2F6B3F]/12 bg-white py-1.5 pl-1.5 pr-3 sm:flex">
            <div className="grid size-8 place-items-center rounded-full bg-[#7FB77E] text-sm font-bold text-white">{(userName ?? 'CT').slice(0, 1).toUpperCase()}</div>
            <span className="max-w-32 truncate text-sm font-semibold">{userName ?? '데모 사용자'}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside className="sticky top-[4.5rem] hidden h-[calc(100vh-4.5rem)] border-r border-[#2F6B3F]/10 bg-[#FFF9D8]/45 p-5 lg:flex lg:flex-col">
          <nav aria-label="주 메뉴" className="space-y-1.5">
            <a href="#calendar" className="flex items-center gap-3 rounded-xl bg-[#2F6B3F] px-3 py-3 text-sm font-bold text-white shadow-sm"><CalendarDays className="size-[1.1rem]" /> 일정 캘린더</a>
            <button type="button" onClick={() => setPinnedOnly(!pinnedOnly)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#526056] transition hover:bg-[#7FB77E]/14 hover:text-[#2F6B3F]">
              <Bookmark className="size-[1.1rem]" /> 관심 학회
              <span className="ml-auto rounded-full bg-[#F7C85C] px-2 py-0.5 text-xs font-bold text-[#4C3B12]">{pinnedIds.length}</span>
            </button>
            <a href="#fields" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#526056] transition hover:bg-[#7FB77E]/14 hover:text-[#2F6B3F]"><LayoutGrid className="size-[1.1rem]" /> 분야 둘러보기</a>
          </nav>

          <div className="mt-8 rounded-2xl border border-[#E7BC51]/35 bg-[#FFF6C0] p-4">
            <div className="mb-3 grid size-9 place-items-center rounded-xl bg-[#F7C85C] text-[#5B4615]"><Sparkles className="size-4" /></div>
            <p className="text-sm font-bold">다가오는 마감</p>
            <p className="mt-1 text-xs leading-5 text-[#657067]">핀한 학회 {pinnedIds.length}개의 주요 일정을 빠르게 모아볼 수 있습니다.</p>
          </div>

          <Link href="/admin" className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#526056] transition hover:bg-[#7FB77E]/14 hover:text-[#2F6B3F]"><Settings2 className="size-[1.1rem]" /> 관리자 페이지</Link>
        </aside>

        <main id="calendar" className="min-w-0 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8">
          <section className="mx-auto max-w-[1320px]">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="bg-[#7FB77E]/18 text-[#2F6B3F] hover:bg-[#7FB77E]/18">2026년 9월</Badge>
                  <span className="text-xs text-[#748078]">예시 일정</span>
                </div>
                <h1 className="text-2xl font-black tracking-[-0.035em] text-[#183E28] sm:text-3xl">학회 일정을 한눈에 관리하세요</h1>
                <p className="mt-2 text-sm leading-6 text-[#68746B] sm:text-base">분야와 지역을 골라 제출, 발표, 등록 일정을 한 화면에서 확인할 수 있습니다.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl border border-[#2F6B3F]/12 bg-white p-1 shadow-sm">
                  <Button variant="ghost" size="icon-sm" aria-label="이전 달" className="text-[#2F6B3F]"><ChevronLeft /></Button>
                  <span className="min-w-28 text-center text-sm font-bold">2026년 9월</span>
                  <Button variant="ghost" size="icon-sm" aria-label="다음 달" className="text-[#2F6B3F]"><ChevronRight /></Button>
                </div>
                <div className="flex rounded-xl border border-[#2F6B3F]/12 bg-white p-1 shadow-sm">
                  <Button variant="ghost" size="icon-sm" aria-label="캘린더 보기" onClick={() => setView('calendar')} className={view === 'calendar' ? 'bg-[#2F6B3F] text-white hover:bg-[#2F6B3F]' : ''}><LayoutGrid /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label="목록 보기" onClick={() => setView('list')} className={view === 'list' ? 'bg-[#2F6B3F] text-white hover:bg-[#2F6B3F]' : ''}><List /></Button>
                </div>
              </div>
            </div>

            <div className="relative mt-5 md:hidden">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6A786D]" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="학회명 또는 약어 검색" aria-label="학회 검색" className="h-11 rounded-xl border-[#2F6B3F]/15 bg-white pl-10" />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#2F6B3F]/10 bg-white p-3 shadow-[0_12px_35px_rgba(47,107,63,0.06)]">
              <Button variant="ghost" className="h-10 gap-2 font-bold text-[#2F6B3F] sm:hidden" onClick={() => setMobileFilters(!mobileFilters)}>{mobileFilters ? <X /> : <Filter />} 필터</Button>
              <div className={`${mobileFilters ? 'flex' : 'hidden'} w-full flex-wrap gap-2 sm:flex sm:w-auto`}>
                <NativeSelect className="w-full sm:w-auto">
                  <NativeSelectOption value="all">모든 일정</NativeSelectOption>
                  <NativeSelectOption value="deadline">제출 마감</NativeSelectOption>
                  <NativeSelectOption value="notification">채택 발표</NativeSelectOption>
                  <NativeSelectOption value="registration">등록</NativeSelectOption>
                </NativeSelect>
                <NativeSelect className="w-full sm:w-auto" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="연구 분야">
                  {categories.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}
                </NativeSelect>
                <NativeSelect className="w-full sm:w-auto" value={region} onChange={(event) => setRegion(event.target.value)} aria-label="지역">
                  <NativeSelectOption value="전체 지역">국내 + 해외</NativeSelectOption>
                  <NativeSelectOption value="국내">국내</NativeSelectOption>
                  <NativeSelectOption value="해외">해외</NativeSelectOption>
                </NativeSelect>
                <Button variant={pinnedOnly ? 'default' : 'outline'} className={`h-8 gap-2 ${pinnedOnly ? 'bg-[#2F6B3F] text-white' : 'border-[#2F6B3F]/15 bg-white text-[#405047]'}`} onClick={() => setPinnedOnly(!pinnedOnly)}><Bookmark className="size-3.5" /> 관심 학회만</Button>
              </div>
              <span className="ml-auto text-sm text-[#6C786F]"><strong className="text-[#2F6B3F]">{filtered.length}</strong>개 학회</span>
              {(query || category !== '전체 분야' || region !== '전체 지역' || pinnedOnly) && <Button variant="ghost" size="sm" onClick={resetFilters}>초기화</Button>}
            </div>

            {view === 'calendar' ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#2F6B3F]/12 bg-white shadow-[0_16px_45px_rgba(47,107,63,0.08)]">
                <div className="grid grid-cols-7 border-b border-[#2F6B3F]/10 bg-[#FFF9DA]">
                  {weekDays.map((day, index) => <div key={day} className={`px-2 py-3 text-center text-xs font-bold ${index === 0 ? 'text-[#B75743]' : index === 6 ? 'text-[#39718C]' : 'text-[#58665C]'}`}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, index) => {
                    const events = filtered.filter((item) => item.date === day);
                    const valid = day >= 1 && day <= 30;
                    const today = day === 8;
                    return (
                      <div key={`${day}-${index}`} className={`min-h-28 border-b border-r border-[#2F6B3F]/8 p-1.5 sm:min-h-32 sm:p-2 ${!valid ? 'bg-[#FBFBF7]' : 'bg-white'} ${(index + 1) % 7 === 0 ? 'border-r-0' : ''}`}>
                        {valid && <div className="mb-1.5 flex items-center justify-between">
                          <span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${today ? 'bg-[#F7C85C] text-[#4F3C0F]' : 'text-[#59665D]'}`}>{day}</span>
                          {events.some((event) => pinnedIds.includes(event.id)) && <BookmarkCheck className="size-3.5 fill-[#F7C85C] text-[#A9780B]" />}
                        </div>}
                        <div className="space-y-1.5">{events.map((conference) => <EventPill key={conference.id} conference={conference} onSelect={setSelected} />)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {filtered.map((conference) => (
                  <button type="button" key={conference.id} onClick={() => setSelected(conference)} className="group flex w-full flex-col gap-4 rounded-2xl border border-[#2F6B3F]/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#7FB77E] hover:shadow-md sm:flex-row sm:items-center">
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#FFF6C0] text-center text-xs font-black text-[#2F6B3F]">D-{Math.max(0, conference.date - 8)}</div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-[#204F31]">{conference.acronym}</h2><Badge variant="outline" className="border-[#7FB77E]/40 text-[#4E6D54]">{conference.category}</Badge></div><p className="mt-1 truncate text-sm text-[#5D6960]">{conference.name}</p></div>
                    <div className="sm:text-right"><p className="text-sm font-bold">9월 {conference.date}일</p><p className="mt-1 text-xs text-[#778179]">{conference.milestone}</p></div>
                  </button>
                ))}
              </div>
            )}

            {filtered.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-[#7FB77E] bg-white px-6 py-16 text-center"><Search className="mx-auto size-8 text-[#7FB77E]" /><h2 className="mt-4 font-bold">조건에 맞는 학회가 없습니다</h2><p className="mt-1 text-sm text-[#6D786F]">필터를 줄이거나 검색어를 바꿔보세요.</p><Button className="mt-5 bg-[#2F6B3F]" onClick={resetFilters}>필터 초기화</Button></div>}
            <p className="mt-4 text-center text-xs text-[#879087]">현재 화면의 일정은 기능 확인을 위한 예시 데이터입니다.</p>
          </section>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-[#2F6B3F]/12 bg-white/95 p-2 shadow-[0_18px_45px_rgba(29,68,41,0.2)] backdrop-blur lg:hidden">
        <button type="button" className="flex flex-col items-center gap-1 px-4 py-1 text-xs font-bold text-[#2F6B3F]"><CalendarDays className="size-5" /> 캘린더</button>
        <button type="button" onClick={() => setPinnedOnly(!pinnedOnly)} className="flex flex-col items-center gap-1 px-4 py-1 text-xs font-semibold text-[#778078]"><Bookmark className="size-5" /> 관심 학회</button>
        <Link href="/admin" className="flex flex-col items-center gap-1 px-4 py-1 text-xs font-semibold text-[#778078]"><Menu className="size-5" /> 관리</Link>
      </nav>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-[92vw] border-[#2F6B3F]/14 bg-[#FFFDF5] sm:max-w-lg">
          {selected && <>
            <SheetHeader className="border-b border-[#2F6B3F]/10 px-6 pb-5 pt-8">
              <div className="mb-3 flex items-center gap-2"><Badge className="bg-[#F7C85C] text-[#4B3910] hover:bg-[#F7C85C]">D-{Math.max(0, selected.date - 8)}</Badge><Badge variant="outline" className="border-[#7FB77E]/40 text-[#4D6C53]">{selected.category}</Badge></div>
              <SheetTitle className="pr-8 text-2xl font-black tracking-[-0.03em] text-[#183E28]">{selected.acronym}</SheetTitle>
              <SheetDescription className="mt-1 leading-6 text-[#647068]">{selected.name}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <Button className={`mb-6 h-11 w-full gap-2 ${pinnedIds.includes(selected.id) ? 'bg-[#F7C85C] text-[#44340E] hover:bg-[#E8B642]' : 'bg-[#2F6B3F] text-white'}`} onClick={() => void togglePin(selected.id)}>{pinnedIds.includes(selected.id) ? <BookmarkCheck /> : <Bookmark />}{pinnedIds.includes(selected.id) ? '관심 학회에서 제거' : '관심 학회로 저장'}</Button>
              <div className="rounded-2xl border border-[#E7BC51]/35 bg-[#FFF6C0] p-4"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8A681A]">다음 일정</p><p className="mt-2 text-lg font-black text-[#3E3111]">{selected.milestone}</p><div className="mt-3 flex items-center gap-2 text-sm text-[#675522]"><Clock3 className="size-4" /> {selected.deadline} ({selected.timezone})</div></div>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 text-[#2F6B3F]" /><div><p className="font-bold">개최 장소</p><p className="mt-1 text-[#6A756C]">{selected.location} · {selected.format}</p></div></div>
                <div className="flex items-start gap-3"><Users className="mt-0.5 size-4 text-[#2F6B3F]" /><div><p className="font-bold">연구 분야</p><p className="mt-1 text-[#6A756C]">{selected.category}</p></div></div>
              </div>
              <div className="mt-6 border-t border-[#2F6B3F]/10 pt-5"><h3 className="font-black">학회 소개</h3><p className="mt-2 text-sm leading-6 text-[#667168]">{selected.description}</p></div>
              <div className="mt-6 border-t border-[#2F6B3F]/10 pt-5"><h3 className="font-black">관련 링크</h3><div className="mt-3 grid gap-2">{selected.links.map((link) => <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#2F6B3F]/10 bg-white px-4 py-3 font-semibold text-[#2F6B3F] transition hover:border-[#7FB77E] hover:bg-[#7FB77E]/8">{link.label} <ExternalLink className="size-4" /></a>)}</div></div>
            </div>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
