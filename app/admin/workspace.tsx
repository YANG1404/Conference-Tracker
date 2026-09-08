'use client';

import { type SyntheticEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Database, ExternalLink, FileCheck2, Globe2, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type Candidate = {
  id: number;
  extracted_name: string;
  extracted_acronym: string;
  extracted_organization: string;
  extracted_country_code: string;
  extracted_city: string;
  extracted_format: string;
  source_url: string;
  review_status: string;
};

type AdminConference = {
  id: number;
  name: string;
  acronym: string;
  country_code: string;
  format: string;
  status: string;
};

type SourceSite = {
  id: number;
  name: string;
  base_url: string;
  source_type: string;
  is_active: number;
  last_collected_at: string | null;
};

type Stats = {
  pending_candidates: number;
  published_conferences: number;
  active_sources: number;
};

export function AdminWorkspace({ userName }: { userName: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [conferences, setConferences] = useState<AdminConference[]>([]);
  const [sources, setSources] = useState<SourceSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rejecting, setRejecting] = useState<Candidate | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    const responses = await Promise.all([
      fetch('/api/v1/admin/overview'),
      fetch('/api/v1/admin/collection-candidates?review_status=PENDING'),
      fetch('/api/v1/admin/conferences'),
      fetch('/api/v1/admin/source-sites'),
    ]);
    if (responses.some((response) => !response.ok)) {
      const denied = responses.some((response) => response.status === 403);
      setErrorMessage(denied ? '이 계정은 관리자 허용 목록에 없습니다.' : '관리 데이터를 불러오지 못했습니다.');
      setLoading(false);
      return;
    }
    const [statsData, candidatesData, conferencesData, sourcesData] = await Promise.all(responses.map((response) => response.json())) as [Stats, { items: Candidate[] }, { items: AdminConference[] }, { items: SourceSite[] }];
    setStats(statsData);
    setCandidates(candidatesData.items);
    setConferences(conferencesData.items);
    setSources(sourcesData.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function approve(candidate: Candidate) {
    const response = await fetch(`/api/v1/admin/collection-candidates/${candidate.id}/approve`, { method: 'POST' });
    if (!response.ok) return setErrorMessage('승인 처리에 실패했습니다.');
    setCandidates((items) => items.filter((item) => item.id !== candidate.id));
    setStats((current) => current ? { ...current, pending_candidates: Math.max(0, current.pending_candidates - 1) } : current);
    setMessage(`${candidate.extracted_acronym} 후보를 승인했습니다.`);
  }

  async function reject() {
    if (!rejecting || !rejectReason.trim()) return;
    const response = await fetch(`/api/v1/admin/collection-candidates/${rejecting.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'REJECTED', reason: rejectReason.trim() }),
    });
    if (!response.ok) return setErrorMessage('거절 처리에 실패했습니다.');
    setCandidates((items) => items.filter((item) => item.id !== rejecting.id));
    setStats((current) => current ? { ...current, pending_candidates: Math.max(0, current.pending_candidates - 1) } : current);
    setMessage(`${rejecting.extracted_acronym} 후보를 거절했습니다.`);
    setRejecting(null);
    setRejectReason('');
  }

  async function createConference(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/admin/conferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        acronym: form.get('acronym'),
        edition_year: Number(form.get('edition_year')),
        country_code: form.get('country_code'),
        city: form.get('city'),
        format: form.get('format'),
        status: 'DRAFT',
      }),
    });
    if (!response.ok) return setErrorMessage('학회 생성에 실패했습니다.');
    const created = await response.json() as AdminConference;
    setConferences((items) => [created, ...items]);
    setCreateOpen(false);
    setMessage('새 학회를 임시 저장했습니다.');
  }

  return (
    <div className="min-h-screen bg-[#F8F8EC] text-[#203126]">
      <header className="bg-[#2F6B3F] text-white">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center gap-4 px-5 sm:px-8">
          <Link href="/" className="grid size-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20" aria-label="캘린더로 돌아가기"><ArrowLeft /></Link>
          <div>
            <p className="text-lg font-black tracking-tight">Conference Tracker Admin</p>
            <p className="text-xs text-white/70">수집 데이터 검수 및 학회 정보 관리</p>
          </div>
          <div className="ml-auto hidden items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm sm:flex"><ShieldCheck className="size-4 text-[#F7C85C]" /> {userName}</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><Badge className="bg-[#FFF6C0] text-[#6A5117] hover:bg-[#FFF6C0]">관리자 전용</Badge><h1 className="mt-3 text-3xl font-black tracking-[-0.035em] text-[#183E28]">검수 대시보드</h1><p className="mt-2 text-sm text-[#68746B]">자동 수집 결과를 확인하고 공개할 학회 정보를 관리합니다.</p></div>
          <div className="flex gap-2"><Button variant="outline" className="border-[#2F6B3F]/15 bg-white" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} /> 새로고침</Button><Button className="bg-[#F7C85C] font-bold text-[#40320E] hover:bg-[#E8B642]" onClick={() => setCreateOpen(true)}><Plus /> 학회 직접 등록</Button></div>
        </div>

        {message && <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#7FB77E]/30 bg-[#EAF4E3] px-4 py-3 text-sm font-semibold text-[#2F6B3F]"><Check className="size-4" /> {message}<button className="ml-auto" onClick={() => setMessage('')} aria-label="알림 닫기"><X className="size-4" /></button></div>}
        {errorMessage && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</div>}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[{ label: '검수 대기', value: stats?.pending_candidates ?? '—', icon: FileCheck2, tone: 'bg-[#FFF6C0] text-[#795914]' }, { label: '공개 학회', value: stats?.published_conferences ?? '—', icon: Globe2, tone: 'bg-[#E5F1DF] text-[#2F6B3F]' }, { label: '활성 수집 출처', value: stats?.active_sources ?? '—', icon: Database, tone: 'bg-[#DDEDDC] text-[#2F6B3F]' }].map((item) => <div key={item.label} className="rounded-2xl border border-[#2F6B3F]/10 bg-white p-5 shadow-sm"><div className={`grid size-10 place-items-center rounded-xl ${item.tone}`}><item.icon className="size-5" /></div><p className="mt-5 text-3xl font-black">{item.value}</p><p className="mt-1 text-sm font-semibold text-[#6C786F]">{item.label}</p></div>)}
        </section>

        <Tabs defaultValue="review" className="mt-8">
          <TabsList className="h-11 w-full justify-start rounded-xl bg-white p-1 shadow-sm sm:w-fit">
            <TabsTrigger value="review" className="px-4">검수 대기 <Badge className="ml-1 bg-[#F7C85C] text-[#4C3B12] hover:bg-[#F7C85C]">{candidates.length}</Badge></TabsTrigger>
            <TabsTrigger value="conferences" className="px-4">학회 관리</TabsTrigger>
            <TabsTrigger value="sources" className="px-4">수집 출처</TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="mt-4 overflow-hidden rounded-2xl border border-[#2F6B3F]/10 bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-[#FFF9DA]"><TableRow><TableHead className="pl-5">수집된 학회</TableHead><TableHead>기관</TableHead><TableHead>지역·형식</TableHead><TableHead>출처</TableHead><TableHead className="pr-5 text-right">검수</TableHead></TableRow></TableHeader>
              <TableBody>
                {candidates.map((candidate) => <TableRow key={candidate.id}>
                  <TableCell className="pl-5"><p className="font-black text-[#204F31]">{candidate.extracted_acronym}</p><p className="mt-1 max-w-[340px] truncate text-xs text-[#748078]">{candidate.extracted_name}</p></TableCell>
                  <TableCell>{candidate.extracted_organization}</TableCell>
                  <TableCell><Badge variant="outline" className="border-[#7FB77E]/40">{candidate.extracted_country_code} · {candidate.extracted_format}</Badge></TableCell>
                  <TableCell><a href={candidate.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#2F6B3F]">원문 <ExternalLink className="size-3.5" /></a></TableCell>
                  <TableCell className="pr-5"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setRejecting(candidate)}>거절</Button><Button size="sm" className="bg-[#2F6B3F]" onClick={() => void approve(candidate)}>승인</Button></div></TableCell>
                </TableRow>)}
                {!loading && candidates.length === 0 && <TableRow><TableCell colSpan={5} className="py-14 text-center text-[#748078]">검수를 기다리는 데이터가 없습니다.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="conferences" className="mt-4 overflow-hidden rounded-2xl border border-[#2F6B3F]/10 bg-white shadow-sm">
            <Table><TableHeader className="bg-[#FFF9DA]"><TableRow><TableHead className="pl-5">학회</TableHead><TableHead>국가</TableHead><TableHead>형식</TableHead><TableHead className="pr-5">상태</TableHead></TableRow></TableHeader><TableBody>{conferences.map((conference) => <TableRow key={conference.id}><TableCell className="pl-5"><p className="font-black">{conference.acronym || '약어 없음'}</p><p className="mt-1 max-w-[520px] truncate text-xs text-[#748078]">{conference.name}</p></TableCell><TableCell>{conference.country_code}</TableCell><TableCell>{conference.format}</TableCell><TableCell className="pr-5"><Badge className={conference.status === 'PUBLISHED' ? 'bg-[#E1F0DD] text-[#2F6B3F]' : 'bg-[#FFF6C0] text-[#6D5318]'}>{conference.status}</Badge></TableCell></TableRow>)}</TableBody></Table>
          </TabsContent>

          <TabsContent value="sources" className="mt-4 grid gap-3 md:grid-cols-2">
            {sources.map((source) => <article key={source.id} className="rounded-2xl border border-[#2F6B3F]/10 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-[#E5F1DF] text-[#2F6B3F]"><Database className="size-5" /></div><Badge className={source.is_active ? 'bg-[#7FB77E]/20 text-[#2F6B3F]' : ''}>{source.is_active ? '활성' : '중지'}</Badge></div><h2 className="mt-4 font-black text-[#204F31]">{source.name}</h2><p className="mt-1 truncate text-sm text-[#718076]">{source.base_url}</p><div className="mt-4 flex items-center justify-between border-t border-[#2F6B3F]/8 pt-4 text-xs text-[#748078]"><span>{source.source_type}</span><span>최근 수집 {source.last_collected_at ? '완료' : '없음'}</span></div></article>)}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="border-[#2F6B3F]/12 bg-[#FFFDF5] sm:max-w-md"><DialogHeader><DialogTitle className="text-xl font-black text-[#204F31]">수집 후보 거절</DialogTitle><DialogDescription>{rejecting?.extracted_acronym}을 공개하지 않는 이유를 기록합니다.</DialogDescription></DialogHeader><Textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="거절 사유를 입력하세요" className="min-h-28" /><DialogFooter><Button variant="outline" onClick={() => setRejecting(null)}>취소</Button><Button variant="destructive" disabled={!rejectReason.trim()} onClick={() => void reject()}>거절 처리</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-[#2F6B3F]/12 bg-[#FFFDF5] sm:max-w-lg"><form onSubmit={createConference}><DialogHeader><DialogTitle className="text-xl font-black text-[#204F31]">학회 직접 등록</DialogTitle><DialogDescription>기본 정보를 입력해 임시 상태로 저장합니다. 일정과 링크는 저장 후 추가합니다.</DialogDescription></DialogHeader><div className="mt-5 grid gap-3"><Input name="name" required placeholder="학회 전체 이름" /><div className="grid grid-cols-2 gap-3"><Input name="acronym" placeholder="약어" /><Input name="edition_year" type="number" defaultValue={2027} placeholder="개최 연도" /></div><div className="grid grid-cols-2 gap-3"><Input name="country_code" required maxLength={2} placeholder="국가 코드 (KR)" /><Input name="city" placeholder="도시" /></div><NativeSelect name="format" className="w-full"><NativeSelectOption value="ONSITE">오프라인</NativeSelectOption><NativeSelectOption value="ONLINE">온라인</NativeSelectOption><NativeSelectOption value="HYBRID">하이브리드</NativeSelectOption></NativeSelect></div><DialogFooter className="mt-5"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>취소</Button><Button type="submit" className="bg-[#2F6B3F]">임시 저장</Button></DialogFooter></form></DialogContent>
      </Dialog>
    </div>
  );
}
