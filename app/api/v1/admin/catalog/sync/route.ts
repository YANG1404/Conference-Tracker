import { env } from 'cloudflare:workers';
import { error, json } from '@/lib/api';
import { syncCatalog } from '@/lib/catalog-repository';
import { getSessionUser, isAdminUser } from '@/lib/google-auth';

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const automationAllowed = Boolean(
    env.CATALOG_SYNC_TOKEN &&
      authorization === `Bearer ${env.CATALOG_SYNC_TOKEN}`,
  );
  const user = automationAllowed ? null : await getSessionUser(request);
  if (!automationAllowed && !user)
    return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  if (!automationAllowed && !isAdminUser(user))
    return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  try {
    return json(await syncCatalog());
  } catch (cause) {
    console.error('catalog-sync-failed', cause);
    return error(502, 'CATALOG_SYNC_FAILED', 'CSV 카탈로그 동기화에 실패했습니다.');
  }
}
