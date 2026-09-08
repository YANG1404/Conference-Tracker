import { error, json } from '@/lib/api';
import { listCandidates, readAuthenticatedUser, requireAdmin } from '@/lib/conference-repository';

export async function GET(request: Request) {
  const user = readAuthenticatedUser(request.headers);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  if (!(await requireAdmin(user))) return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  const status = new URL(request.url).searchParams.get('review_status') ?? 'PENDING';
  return json({ items: await listCandidates(status) });
}
