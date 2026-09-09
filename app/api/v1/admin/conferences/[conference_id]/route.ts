import { error, json } from '@/lib/api';
import {
  getAdminConference,
  requireAdmin,
  updateConference,
  type ConferenceInput,
} from '@/lib/conference-repository';
import { getRepositoryUser } from '@/lib/google-auth';

type RouteContext = { params: Promise<{ conference_id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const user = await getRepositoryUser(request);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  if (!(await requireAdmin(user)))
    return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  const { conference_id: rawId } = await context.params;
  const conference = await getAdminConference(Number(rawId));
  if (!conference) return error(404, 'NOT_FOUND', '학회를 찾을 수 없습니다.');
  return json(conference);
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getRepositoryUser(request);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const body = (await request
    .json()
    .catch(() => null)) as ConferenceInput | null;
  if (!body?.name?.trim() || !body.country_code || !body.format)
    return error(
      422,
      'VALIDATION_ERROR',
      '학회명, 국가, 개최 형식은 필수입니다.',
    );
  if (
    body.milestones?.some(
      (item) =>
        !item.title?.trim() ||
        !item.event_at ||
        !item.original_timezone?.trim(),
    )
  )
    return error(
      422,
      'VALIDATION_ERROR',
      '공식 일정의 이름, 일시, 시간대는 필수입니다.',
    );
  if (body.links?.some((item) => !item.label?.trim() || !item.url?.trim()))
    return error(
      422,
      'VALIDATION_ERROR',
      '관련 링크의 이름과 URL은 필수입니다.',
    );
  const { conference_id: rawId } = await context.params;
  const result = await updateConference(user, Number(rawId), body);
  if (result.kind === 'forbidden')
    return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  if (result.kind === 'not_found')
    return error(404, 'NOT_FOUND', '학회를 찾을 수 없습니다.');
  return json(result.conference);
}
