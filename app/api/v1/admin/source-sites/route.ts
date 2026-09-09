import { error, json } from '@/lib/api';
import {
  createSourceSite,
  listSources,
  requireAdmin,
  type SourceSiteInput,
} from '@/lib/conference-repository';
import { getRepositoryUser } from '@/lib/google-auth';

export async function GET(request: Request) {
  const user = await getRepositoryUser(request);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  if (!(await requireAdmin(user)))
    return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  return json({ items: await listSources() });
}

export async function POST(request: Request) {
  const user = await getRepositoryUser(request);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const body = (await request
    .json()
    .catch(() => null)) as SourceSiteInput | null;
  if (!body?.name?.trim() || !body.base_url?.trim() || !body.source_type)
    return error(422, 'VALIDATION_ERROR', '출처명, 주소, 유형은 필수입니다.');
  const result = await createSourceSite(user, body);
  if (result.kind === 'forbidden')
    return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  return json(result.source, 201);
}
