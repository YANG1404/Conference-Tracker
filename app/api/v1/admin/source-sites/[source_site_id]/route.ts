import { error, json } from '@/lib/api';
import {
  readAuthenticatedUser,
  updateSourceSite,
  type SourceSiteInput,
} from '@/lib/conference-repository';

type RouteContext = { params: Promise<{ source_site_id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = readAuthenticatedUser(request.headers);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const body = (await request
    .json()
    .catch(() => null)) as SourceSiteInput | null;
  if (!body?.name?.trim() || !body.base_url?.trim() || !body.source_type)
    return error(422, 'VALIDATION_ERROR', '출처명, 주소, 유형은 필수입니다.');
  const { source_site_id: rawId } = await context.params;
  const result = await updateSourceSite(user, Number(rawId), body);
  if (result.kind === 'forbidden')
    return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  if (result.kind === 'not_found')
    return error(404, 'NOT_FOUND', '수집 출처를 찾을 수 없습니다.');
  return json(result.source);
}
