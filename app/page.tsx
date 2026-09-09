import { ConferenceWorkspace } from './conference-workspace';
import { getPageSessionUser, isAdminUser } from '@/lib/google-auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getPageSessionUser();

  return (
    <ConferenceWorkspace
      userName={user?.displayName ?? null}
      userEmail={user?.email ?? null}
      isAuthenticated={Boolean(user)}
      isAdmin={isAdminUser(user)}
    />
  );
}
