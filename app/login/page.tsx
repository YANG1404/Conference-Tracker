import { CalendarDays } from 'lucide-react';
import { googleClientId, getPageSessionUser } from '@/lib/google-auth';
import { GoogleSignIn } from './google-sign-in';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getPageSessionUser();
  if (user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FFFDF2] px-5 text-[#203126]">
        <div className="rounded-3xl border border-[#2F6B3F]/12 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-[#204F31]">
            이미 로그인되어 있습니다
          </h1>
          <form action="/" method="get">
            <button
              type="submit"
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#2F6B3F] px-5 font-bold text-white"
            >
              캘린더로 돌아가기
            </button>
          </form>
        </div>
      </main>
    );
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#FFFDF2] px-5 text-[#203126]">
      <section className="w-full max-w-md rounded-3xl border border-[#2F6B3F]/12 bg-white p-7 shadow-[0_24px_70px_rgba(47,107,63,0.14)] sm:p-9">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#2F6B3F] text-[#FFF6C0]">
          <CalendarDays />
        </div>
        <h1 className="mt-5 text-center text-2xl font-black text-[#204F31]">
          Google 계정으로 로그인
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-[#68746B]">
          관심 학회와 관심 분야를 저장하려면 로그인이 필요합니다. 학회 검색과
          일정 확인은 로그인 없이 이용할 수 있습니다.
        </p>
        <div className="mt-7 flex justify-center">
          <GoogleSignIn clientId={googleClientId()} />
        </div>
        <form action="/" method="get" className="mt-6 text-center">
          <button
            type="submit"
            className="text-sm font-bold text-[#2F6B3F] underline underline-offset-4"
          >
            로그인 없이 둘러보기
          </button>
        </form>
      </section>
    </main>
  );
}
