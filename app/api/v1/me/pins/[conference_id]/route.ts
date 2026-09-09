import { error, json, parsePositiveId } from '@/lib/api';
import { putPin, removePin } from '@/lib/conference-repository';
import { getSessionUser } from '@/lib/google-auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ conference_id: string }> },
) {
  const session = await getSessionUser(request);
  const user = session
    ? { externalUserId: session.externalUserId, email: session.email }
    : null;
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const id = parsePositiveId((await params).conference_id);
  if (!id)
    return error(
      400,
      'INVALID_PARAMETER',
      'conference_id가 올바르지 않습니다.',
    );
  try {
    return json(await putPin(user, id), 201);
  } catch {
    return error(404, 'RESOURCE_NOT_FOUND', '학회를 찾을 수 없습니다.');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ conference_id: string }> },
) {
  const session = await getSessionUser(request);
  const user = session
    ? { externalUserId: session.externalUserId, email: session.email }
    : null;
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const id = parsePositiveId((await params).conference_id);
  if (!id)
    return error(
      400,
      'INVALID_PARAMETER',
      'conference_id가 올바르지 않습니다.',
    );
  await removePin(user, id);
  return new Response(null, { status: 204 });
}
