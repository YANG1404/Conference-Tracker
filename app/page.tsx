import { getChatGPTUser } from './chatgpt-auth';
import { ConferenceWorkspace } from './conference-workspace';
import { requireAdmin } from '@/lib/conference-repository';

export default async function Home() {
  const user = await getChatGPTUser();
  const isAdmin = user
    ? Boolean(
        await requireAdmin({
          externalUserId: user.userId,
          email: user.email,
        }),
      )
    : false;

  return (
    <ConferenceWorkspace
      userName={user?.displayName ?? null}
      isAdmin={isAdmin}
    />
  );
}
