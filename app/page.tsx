import { displayDay } from '@/lib/schedule-time';
import { ConferenceWorkspace } from './conference-workspace';
import { getPageSessionUser, isAdminUser } from '@/lib/google-auth';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ conference?: string; year?: string; month?: string }>;
}) {
  const user = await getPageSessionUser();
  const params = await searchParams;
  const today = displayDay(new Date().toISOString());
  const year = Number(params.year);
  const month = Number(params.month);
  const conferenceId = Number(params.conference);

  return (
    <ConferenceWorkspace
      initialYear={
        Number.isInteger(year) && year >= 1900 && year <= 2100
          ? year
          : Number(today.slice(0, 4))
      }
      initialMonth={
        Number.isInteger(month) && month >= 1 && month <= 12
          ? month
          : Number(today.slice(5, 7))
      }
      userName={user?.displayName ?? null}
      userEmail={user?.email ?? null}
      userImage={user?.profileImageUrl ?? null}
      isAuthenticated={Boolean(user)}
      isAdmin={isAdminUser(user)}
      initialConferenceId={Number.isInteger(conferenceId) ? conferenceId : null}
    />
  );
}
