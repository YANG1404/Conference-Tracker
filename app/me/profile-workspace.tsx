'use client';
import { dayDifference } from '@/lib/schedule-time';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  CalendarClock,
  Check,
  ExternalLink,
  Star,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

export type Field = {
  id: number;
  acm_ccs_code: string;
  name_ko: string;
  name_en: string;
  depth?: number;
  is_primary?: number;
};

type PinnedConference = {
  id: number;
  name: string;
  acronym: string | null;
  edition_year: number | null;
  country_code: string;
  format: string;
  next_group_name: string | null;
  next_milestone_title: string | null;
  next_milestone_at: string | null;
  next_milestone_timezone: string | null;
  pinned_at: string;
  research_fields: Field[];
};

export type Profile = {
  id: number;
  email: string;
  display_name: string;
  profile_image_url: string | null;
  role: string;
  created_at: string;
  research_fields: Field[];
  pinned_conference_count: number;
  pinned_conferences: PinnedConference[];
};

function dDay(value: string | null) {
  if (!value) return '예정 없음';
  const days = dayDifference(value);
  if (days === 0) return 'D-Day';
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}

function formatDate(value: string | null) {
  if (!value) return '등록된 다음 일정이 없습니다.';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: value.length > 10 ? '2-digit' : undefined,
    minute: value.length > 10 ? '2-digit' : undefined,
    timeZone: value.length > 10 ? 'Asia/Seoul' : 'UTC',
  }).format(new Date(value));
}

export function ProfileWorkspace({
  initialProfile,
  fields,
}: {
  initialProfile: Profile;
  fields: Field[];
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [selectedFieldIds, setSelectedFieldIds] = useState(
    initialProfile.research_fields.map((field) => Number(field.id)),
  );
  const [primaryFieldId, setPrimaryFieldId] = useState<number | null>(
    Number(
      initialProfile.research_fields.find((field) => field.is_primary)?.id,
    ) || null,
  );
  const [sort, setSort] = useState<'DATE' | 'NAME'>('DATE');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const sortedPins = useMemo(() => {
    return [...profile.pinned_conferences].sort((left, right) => {
      if (sort === 'NAME')
        return (left.acronym ?? left.name).localeCompare(
          right.acronym ?? right.name,
        );
      if (!left.next_milestone_at) return 1;
      if (!right.next_milestone_at) return -1;
      return left.next_milestone_at.localeCompare(right.next_milestone_at);
    });
  }, [profile.pinned_conferences, sort]);

  async function saveProfile() {
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/v1/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName,
        research_field_ids: selectedFieldIds,
        primary_research_field_id: primaryFieldId,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage('저장하지 못했습니다. 입력 내용을 확인해 주세요.');
      return;
    }
    const updated = (await response.json()) as Profile;
    setProfile(updated);
    setMessage('계정 정보와 관심 분야를 저장했습니다.');
  }

  async function removePin(conferenceId: number) {
    const response = await fetch(`/api/v1/me/pins/${conferenceId}`, {
      method: 'DELETE',
    });
    if (!response.ok) return;
    setProfile((current) => ({
      ...current,
      pinned_conference_count: current.pinned_conference_count - 1,
      pinned_conferences: current.pinned_conferences.filter(
        (conference) => conference.id !== conferenceId,
      ),
    }));
  }

  return (
    <div className="min-h-screen bg-[#FFFDF2] text-[#203126]">
      <header className="border-b border-[#2F6B3F]/10 bg-[#2F6B3F] text-white">
        <div className="mx-auto flex h-20 max-w-6xl items-center gap-4 px-5 sm:px-8">
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
            aria-label="캘린더로 돌아가기"
          >
            <ArrowLeft />
          </button>
          <div>
            <p className="text-lg font-black">내 정보</p>
            <p className="text-xs text-white/70">관심 분야와 관심 학회 관리</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
        {message && (
          <div className="flex items-center gap-2 rounded-xl border border-[#7FB77E]/30 bg-[#EAF4E3] px-4 py-3 text-sm font-bold text-[#2F6B3F]">
            <Check className="size-4" /> {message}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-[#2F6B3F]/10 bg-white p-6 shadow-sm">
            {profile.profile_image_url ? (
              <div
                className="size-20 rounded-2xl bg-cover bg-center"
                style={{
                  backgroundImage: `url(${profile.profile_image_url})`,
                }}
              />
            ) : (
              <div className="grid size-20 place-items-center rounded-2xl bg-[#7FB77E]/20 text-[#2F6B3F]">
                <UserRound className="size-9" />
              </div>
            )}
            <h1 className="mt-4 text-2xl font-black text-[#204F31]">
              {profile.display_name}
            </h1>
            <p className="mt-1 break-all text-sm text-[#68746B]">
              {profile.email}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#FFF9DA] p-3">
                <p className="text-xl font-black text-[#2F6B3F]">
                  {profile.pinned_conference_count}
                </p>
                <p className="text-xs text-[#68746B]">관심 학회</p>
              </div>
              <div className="rounded-xl bg-[#EAF4E3] p-3">
                <p className="text-xl font-black text-[#2F6B3F]">
                  {selectedFieldIds.length}
                </p>
                <p className="text-xs text-[#68746B]">관심 분야</p>
              </div>
            </div>
            <p className="mt-5 text-xs text-[#7B867E]">
              가입일 {new Date(profile.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>

          <div className="rounded-3xl border border-[#2F6B3F]/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-[#204F31]">계정 정보</h2>
            <div className="mt-5 space-y-4">
              <label
                htmlFor="profile-email"
                className="block text-sm font-bold"
              >
                Google 이메일
                <Input
                  id="profile-email"
                  value={profile.email}
                  disabled
                  className="mt-2"
                />
              </label>
              <label htmlFor="profile-name" className="block text-sm font-bold">
                표시 이름
                <Input
                  id="profile-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-2"
                  maxLength={80}
                />
              </label>
            </div>

            <div className="mt-7 border-t border-[#2F6B3F]/10 pt-6">
              <h2 className="text-xl font-black text-[#204F31]">관심 분야</h2>
              <p className="mt-1 text-sm text-[#68746B]">
                복수 선택 후 별표로 대표 관심 분야를 지정할 수 있습니다.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {fields.map((field) => {
                  const checked = selectedFieldIds.includes(Number(field.id));
                  const id = `profile-field-${field.id}`;
                  return (
                    <div
                      key={field.id}
                      className={`flex items-start gap-3 rounded-xl border p-3 ${checked ? 'border-[#7FB77E] bg-[#F0F7EC]' : 'border-[#2F6B3F]/10'}`}
                    >
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(value) => {
                          const fieldId = Number(field.id);
                          setSelectedFieldIds((current) =>
                            value
                              ? [...new Set([...current, fieldId])]
                              : current.filter((item) => item !== fieldId),
                          );
                          if (!value && primaryFieldId === fieldId)
                            setPrimaryFieldId(null);
                        }}
                      />
                      <label
                        htmlFor={id}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="block text-sm font-bold">
                          {field.name_ko}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#7B867E]">
                          {field.name_en}
                        </span>
                      </label>
                      {checked && (
                        <button
                          type="button"
                          onClick={() => setPrimaryFieldId(Number(field.id))}
                          className="shrink-0"
                          aria-label={`${field.name_ko}을 대표 관심 분야로 지정`}
                        >
                          <Star
                            className={`size-4 ${primaryFieldId === Number(field.id) ? 'fill-[#F7C85C] text-[#B78413]' : 'text-[#A7AFA9]'}`}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Button
              className="mt-6 bg-[#2F6B3F] text-white"
              onClick={() => void saveProfile()}
              disabled={saving || !displayName.trim()}
            >
              {saving ? '저장 중…' : '변경 사항 저장'}
            </Button>
          </div>
        </section>

        <section
          id="interests"
          className="rounded-3xl border border-[#2F6B3F]/10 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-[#204F31]">관심 학회</h2>
              <p className="mt-1 text-sm text-[#68746B]">
                저장한 학회의 다음 공식 일정을 확인하고 관리합니다.
              </p>
            </div>
            <NativeSelect
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as 'DATE' | 'NAME')
              }
              aria-label="관심 학회 정렬"
            >
              <NativeSelectOption value="DATE">
                일정 가까운 순
              </NativeSelectOption>
              <NativeSelectOption value="NAME">학회명 순</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="mt-5 grid gap-3">
            {sortedPins.map((conference) => (
              <article
                key={conference.id}
                className="grid gap-4 rounded-2xl border border-[#2F6B3F]/10 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-[#204F31]">
                      {conference.acronym ?? conference.name}{' '}
                      {conference.edition_year ?? ''}
                    </h3>
                    {conference.research_fields.slice(0, 2).map((field) => (
                      <Badge key={field.id} variant="outline">
                        {field.name_ko}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#405047]">
                    {[
                      conference.next_group_name,
                      conference.next_milestone_title,
                    ]
                      .filter(Boolean)
                      .join(' – ') || '등록된 다음 일정이 없습니다.'}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-[#748078]">
                    <CalendarClock className="size-3.5" />
                    {formatDate(conference.next_milestone_at)}{' '}
                    {conference.next_milestone_timezone
                      ? `(${conference.next_milestone_timezone})`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#FFF6C0] text-[#5B4512]">
                    {dDay(conference.next_milestone_at)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.location.assign(`/?conference=${conference.id}`)
                    }
                  >
                    상세 <ExternalLink />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#6B3F34]"
                    onClick={() => void removePin(conference.id)}
                  >
                    <BookmarkCheck /> 해제
                  </Button>
                </div>
              </article>
            ))}
            {sortedPins.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#7FB77E] py-12 text-center text-sm text-[#68746B]">
                아직 저장한 관심 학회가 없습니다.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
