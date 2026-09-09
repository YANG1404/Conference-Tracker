'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CatalogItem = {
  id: number;
  acronym: string;
  name: string;
  dblp_key: string;
  source_row_count: number;
  presentation_types: string | null;
  tracks: string | null;
  normalized_score: number | null;
  ksi_grade: string | null;
  kaist_recognized: number;
  snu_recognized: number;
  postech_grade: string | null;
};

type CatalogResponse = {
  items: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
  status: {
    status: string;
    source_url: string;
    row_count: number;
    series_count: number;
    last_synced_at: string | null;
  };
};

const pageSize = 50;

export function CatalogWorkspace() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const parameters = new URLSearchParams({
      limit: `${pageSize}`,
      offset: `${page * pageSize}`,
    });
    if (submittedQuery) parameters.set('q', submittedQuery);
    const response = await fetch(`/api/v1/catalog?${parameters}`);
    if (response.ok) setData((await response.json()) as CatalogResponse);
    setLoading(false);
  }, [page, submittedQuery]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="min-h-screen bg-[#FFFDF2] text-[#203126]">
      <header className="bg-[#2F6B3F] text-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-5 sm:px-8">
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
            aria-label="캘린더로 돌아가기"
          >
            <ArrowLeft />
          </button>
          <div>
            <p className="text-lg font-black">CS 학회 카탈로그</p>
            <p className="text-xs text-white/70">기준 목록과 정규화 결과</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ['CSV 원본 행', data?.status.row_count ?? '—'],
            ['중복 병합 학회', data?.status.series_count ?? '—'],
            ['검색 결과', data?.total ?? '—'],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#2F6B3F]/10 bg-white p-5 shadow-sm"
            >
              <Database className="size-5 text-[#2F6B3F]" />
              <p className="mt-4 text-3xl font-black text-[#204F31]">{value}</p>
              <p className="mt-1 text-sm text-[#68746B]">{label}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-[#2F6B3F]/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BookOpenText className="size-5 text-[#2F6B3F]" />
                <h1 className="text-2xl font-black text-[#204F31]">
                  전체 우수 학술대회 목록
                </h1>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#68746B]">
                CSV의 모든 행을 보존하며 oral·poster·spotlight는 하나의 학회로
                병합하고 Findings는 트랙으로 표시합니다.
              </p>
              {data?.status.source_url && (
                <a
                  href="https://gist.github.com/Pusnow/6eb933355b5cb8d31ef1abcb3c3e1206"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#2F6B3F] underline underline-offset-4"
                >
                  기준 CSV 원본 보기 <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            {data?.status.last_synced_at && (
              <p className="text-xs text-[#7B867E]">
                마지막 동기화{' '}
                {new Date(data.status.last_synced_at).toLocaleString('ko-KR')}
              </p>
            )}
          </div>

          <form
            className="mt-5 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(0);
              setSubmittedQuery(query.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#728078]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="약어, 학회명 또는 DBLP Key 검색"
              />
            </div>
            <Button type="submit" className="bg-[#2F6B3F] text-white">
              검색
            </Button>
          </form>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[#2F6B3F]/10">
            <Table>
              <TableHeader className="bg-[#FFF9DA]">
                <TableRow>
                  <TableHead className="pl-5">학회</TableHead>
                  <TableHead>DBLP Key</TableHead>
                  <TableHead>원본 병합</TableHead>
                  <TableHead>등급 정보</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-5">
                      <p className="font-black text-[#204F31]">
                        {item.acronym}
                      </p>
                      <p className="mt-1 max-w-[440px] text-xs text-[#68746B]">
                        {item.name}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.dblp_key}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">
                          {item.source_row_count}행
                        </Badge>
                        {item.presentation_types && (
                          <Badge className="bg-[#EAF4E3] text-[#2F6B3F]">
                            {item.presentation_types}
                          </Badge>
                        )}
                        {item.tracks && (
                          <Badge className="bg-[#FFF6C0] text-[#6B5117]">
                            {item.tracks}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[#59675D]">
                      {[
                        item.ksi_grade && `KIISE ${item.ksi_grade}`,
                        item.normalized_score != null &&
                          `정규화 ${Number(item.normalized_score).toFixed(2)}`,
                        item.kaist_recognized && 'KAIST',
                        item.snu_recognized && 'SNU',
                        item.postech_grade && `POSTECH ${item.postech_grade}`,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && !data?.items.length && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-16 text-center text-[#748078]"
                    >
                      {data?.status.status === 'NOT_SYNCED'
                        ? '관리자 카탈로그 동기화가 필요합니다.'
                        : '검색 결과가 없습니다.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-[#68746B]">
              {data?.total ?? 0}개 중{' '}
              {(data?.total ?? 0) ? page * pageSize + 1 : 0}–
              {Math.min((page + 1) * pageSize, data?.total ?? 0)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0 || loading}
                aria-label="이전 페이지"
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-20 text-center text-sm font-bold">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setPage((current) => Math.min(totalPages - 1, current + 1))
                }
                disabled={page + 1 >= totalPages || loading}
                aria-label="다음 페이지"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
