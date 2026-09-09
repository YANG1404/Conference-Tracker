import { env } from 'cloudflare:workers';
import { error, json } from '@/lib/api';
import { getSessionUser, isAdminUser } from '@/lib/google-auth';
import {
  collectDue,
  collectOfficial,
  configureOfficial,
  listScheduleFeeds,
  syncCcf,
} from '@/lib/schedule-repository';

async function access(request: Request) {
  const token = env.SCHEDULE_SYNC_TOKEN;
  if (token && request.headers.get('authorization') === 'Bearer ' + token)
    return null;
  const user = await getSessionUser(request);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  if (!isAdminUser(user))
    return error(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
  if (
    request.method !== 'GET' &&
    request.headers.get('origin') !== new URL(request.url).origin
  )
    return error(403, 'INVALID_ORIGIN', '동일 출처 요청만 허용합니다.');
  return null;
}
export async function GET(request: Request) {
  const denied = await access(request);
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get('conference_id'));
  return json({
    items: await listScheduleFeeds(id || undefined),
    gemini_configured: Boolean(env.GEMINI_API_KEY),
    model: env.GEMINI_MODEL || 'gemini-3.6-flash',
  });
}
export async function POST(request: Request) {
  const denied = await access(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    feed_id?: number;
    conference_id?: number;
    url?: string;
    enabled?: boolean;
  } | null;
  try {
    if (body?.action === 'ccf') return json(await syncCcf());
    if (body?.action === 'due') return json(await collectDue());
    if (body?.action === 'official' && Number.isInteger(body.feed_id))
      return json(await collectOfficial(body.feed_id!));
    if (
      body?.action === 'configure' &&
      Number.isInteger(body.conference_id) &&
      typeof body.url === 'string'
    )
      return json(
        await configureOfficial(
          body.conference_id!,
          body.url,
          body.enabled === true,
        ),
      );
    return error(400, 'INVALID_ACTION', '수집 작업 또는 입력값을 확인하세요.');
  } catch (cause) {
    return error(
      502,
      'COLLECTION_FAILED',
      cause instanceof Error ? cause.message : '수집에 실패했습니다.',
    );
  }
}
