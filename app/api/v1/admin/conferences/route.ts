import { error, json } from '@/lib/api';
import { createConference, listAdminConferences, readAuthenticatedUser, requireAdmin, type ConferenceInput } from '@/lib/conference-repository';

export async function GET(request: Request) {
  const user = readAuthenticatedUser(request.headers);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  if (!(await requireAdmin(user))) return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  return json({ items: await listAdminConferences() });
}

export async function POST(request: Request) {
  const user = readAuthenticatedUser(request.headers);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const body = await request.json().catch(() => null) as ConferenceInput | null;
  if (!body?.name?.trim() || !body.country_code || !body.format) return error(422, 'VALIDATION_ERROR', '학회명, 국가, 개최 형식은 필수입니다.');
  const result = await createConference(user, body);
  if (result.kind === 'forbidden') return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  return json(result.conference, 201);
}
