import { ConferenceWorkspace } from './conference-workspace';
import { getPageSessionUser, isAdminUser } from '@/lib/google-auth';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ conference?: string }>;
}) {
  const user = await getPageSessionUser();
  const conferenceId = Number((await searchParams).conference);

  return (
    <ConferenceWorkspace
      userName={user?.displayName ?? null}
      userEmail={user?.email ?? null}
      userImage={user?.profileImageUrl ?? null}
      isAuthenticated={Boolean(user)}
      isAdmin={isAdminUser(user)}
      initialConferenceId={Number.isInteger(conferenceId) ? conferenceId : null}
    />
  );
}
