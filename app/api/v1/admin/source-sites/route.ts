import { error, json } from '@/lib/api';
import { listSources, readAuthenticatedUser, requireAdmin } from '@/lib/conference-repository';

export async function GET(request: Request) {
  const user = readAuthenticatedUser(request.headers);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  if (!(await requireAdmin(user))) return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  return json({ items: await listSources() });
}
