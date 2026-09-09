import { AdminWorkspace } from './workspace';
import { getPageSessionUser, isAdminUser } from '@/lib/google-auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getPageSessionUser();
  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FFFDF2] px-5 text-[#203126]">
        <div className="max-w-md rounded-3xl border border-[#2F6B3F]/12 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-[#204F31]">
            관리자 로그인이 필요합니다
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#68746B]">
            학회 정보와 공식 일정 편집 기능은 허용된 관리자만 사용할 수
            있습니다.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#2F6B3F] px-5 font-bold text-white"
          >
            Google로 로그인
          </Link>
        </div>
      </main>
    );
  }

  if (!isAdminUser(user)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FFFDF2] px-5 text-[#203126]">
        <div className="max-w-md rounded-3xl border border-[#2F6B3F]/12 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-[#204F31]">
            관리자 권한이 없습니다
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#68746B]">
            관리자 페이지는 허용된 관리자 계정으로만 이용할 수 있습니다.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#2F6B3F] px-5 font-bold text-white"
          >
            캘린더로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return <AdminWorkspace userName={user.displayName} />;
}
