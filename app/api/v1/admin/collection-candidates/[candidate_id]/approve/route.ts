import { error, json, parsePositiveId } from '@/lib/api';
import { decideCandidate } from '@/lib/conference-repository';
import { getRepositoryUser } from '@/lib/google-auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ candidate_id: string }> },
) {
  const user = await getRepositoryUser(request);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const id = parsePositiveId((await params).candidate_id);
  if (!id)
    return error(400, 'INVALID_PARAMETER', 'candidate_id가 올바르지 않습니다.');
  const result = await decideCandidate(user, id, 'APPROVED');
  if (result.kind === 'forbidden')
    return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  if (result.kind === 'not_found')
    return error(404, 'RESOURCE_NOT_FOUND', '검수 후보를 찾을 수 없습니다.');
  if (result.kind === 'conflict')
    return error(409, 'RESOURCE_CONFLICT', '이미 처리된 검수 후보입니다.');
  return json(result);
}
