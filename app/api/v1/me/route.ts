import { error, json } from '@/lib/api';
import { getSessionUser, isAdminUser } from '@/lib/google-auth';
import {
  getProfile,
  updateProfile,
  validResearchFieldIds,
} from '@/lib/profile-repository';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const profile = await getProfile(user);
  return json({
    ...profile,
    role: isAdminUser(user) ? 'ADMIN' : user.role,
    is_admin: isAdminUser(user),
  });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const body = (await request.json().catch(() => null)) as {
    display_name?: string;
    research_field_ids?: number[];
    primary_research_field_id?: number | null;
  } | null;
  if (!body?.display_name?.trim() || !Array.isArray(body.research_field_ids))
    return error(
      422,
      'VALIDATION_ERROR',
      '표시 이름과 관심 분야를 확인해 주세요.',
    );
  const requestedFieldIds = [
    ...new Set(body.research_field_ids.filter(Number.isInteger)),
  ];
  if (
    body.primary_research_field_id != null &&
    !requestedFieldIds.includes(body.primary_research_field_id)
  )
    return error(
      422,
      'VALIDATION_ERROR',
      '대표 관심 분야는 선택한 관심 분야 중에서 지정해 주세요.',
    );
  const validFieldIds = await validResearchFieldIds(requestedFieldIds);
  if (validFieldIds.length !== requestedFieldIds.length)
    return error(
      422,
      'VALIDATION_ERROR',
      '존재하지 않거나 비활성화된 관심 분야가 포함되어 있습니다.',
    );
  return json(
    await updateProfile(user, {
      display_name: body.display_name,
      research_field_ids: validFieldIds,
      primary_research_field_id: body.primary_research_field_id ?? null,
    }),
  );
}
