import { error, json, parsePositiveId } from '@/lib/api';
import { decideCandidate, readAuthenticatedUser } from '@/lib/conference-repository';

export async function POST(request: Request, { params }: { params: Promise<{ candidate_id: string }> }) {
  const user = readAuthenticatedUser(request.headers);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const id = parsePositiveId((await params).candidate_id);
  if (!id) return error(400, 'INVALID_PARAMETER', 'candidate_id가 올바르지 않습니다.');
  const body = await request.json().catch(() => ({})) as { decision?: string; reason?: string };
  const decision = body.decision === 'DUPLICATE' ? 'DUPLICATE' : 'REJECTED';
  if (!body.reason?.trim()) return error(422, 'VALIDATION_ERROR', '거절 또는 중복 처리 사유를 입력해 주세요.');
  const result = await decideCandidate(user, id, decision, body.reason.trim());
  if (result.kind === 'forbidden') return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  if (result.kind === 'not_found') return error(404, 'RESOURCE_NOT_FOUND', '검수 후보를 찾을 수 없습니다.');
  if (result.kind === 'conflict') return error(409, 'RESOURCE_CONFLICT', '이미 처리된 검수 후보입니다.');
  return json(result);
}
