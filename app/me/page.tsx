import { getPageSessionUser } from '@/lib/google-auth';
import { listResearchFields } from '@/lib/conference-repository';
import { getProfile } from '@/lib/profile-repository';
import {
  ProfileWorkspace,
  type Field,
  type Profile,
} from './profile-workspace';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getPageSessionUser();
  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FFFDF2] px-5 text-[#203126]">
        <section className="w-full max-w-md rounded-3xl border border-[#2F6B3F]/12 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-[#204F31]">
            내 정보는 로그인 후 이용할 수 있습니다
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#68746B]">
            관심 분야와 관심 학회를 계정에 저장하려면 Google 로그인이
            필요합니다.
          </p>
          <form action="/login" method="get">
            <input type="hidden" name="return_to" value="/me" />
            <button
              type="submit"
              className="mt-6 h-11 rounded-xl bg-[#2F6B3F] px-5 font-bold text-white"
            >
              Google로 로그인
            </button>
          </form>
        </section>
      </main>
    );
  }

  const [profile, fields] = (await Promise.all([
    getProfile(user),
    listResearchFields(),
  ])) as [Profile, Field[]];
  return <ProfileWorkspace initialProfile={profile} fields={fields} />;
}
