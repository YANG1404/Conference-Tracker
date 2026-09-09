import { error, json } from '@/lib/api';
import { getCatalogStatus } from '@/lib/catalog-repository';
import { getSessionUser, isAdminUser } from '@/lib/google-auth';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  if (!isAdminUser(user))
    return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  return json(await getCatalogStatus());
}
