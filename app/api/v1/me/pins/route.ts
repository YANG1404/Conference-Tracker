import { error, json } from '@/lib/api';
import { listPins } from '@/lib/conference-repository';
import { getSessionUser } from '@/lib/google-auth';

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  const user = session
    ? { externalUserId: session.externalUserId, email: session.email }
    : null;
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  try {
    const pins = await listPins(user);
    return json({ items: pins });
  } catch {
    return error(500, 'INTERNAL_ERROR', '관심 학회를 불러오지 못했습니다.');
  }
}
