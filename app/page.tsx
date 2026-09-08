import { getChatGPTUser } from './chatgpt-auth';
import { ConferenceWorkspace } from './conference-workspace';

export default async function Home() {
  const user = await getChatGPTUser();

  return <ConferenceWorkspace userName={user?.displayName ?? null} />;
}
