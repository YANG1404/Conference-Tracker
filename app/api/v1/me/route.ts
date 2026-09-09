import { error, json } from '@/lib/api';
import { getSessionUser, isAdminUser } from '@/lib/google-auth';
import { getProfile, updateProfile } from '@/lib/profile-repository';

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
  return json(
    await updateProfile(user, {
      display_name: body.display_name,
      research_field_ids: body.research_field_ids.filter(Number.isInteger),
      primary_research_field_id: body.primary_research_field_id ?? null,
    }),
  );
}
