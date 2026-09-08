import { error, json } from '@/lib/api';
import { listPins, readAuthenticatedUser } from '@/lib/conference-repository';

export async function GET(request: Request) {
  const user = readAuthenticatedUser(request.headers);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  try {
    const pins = await listPins(user);
    return json({ items: pins });
  } catch {
    return error(500, 'INTERNAL_ERROR', '관심 학회를 불러오지 못했습니다.');
  }
}
