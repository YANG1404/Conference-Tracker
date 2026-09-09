import { error, json } from '@/lib/api';
import { createGoogleSession, sessionCookie } from '@/lib/google-auth';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return error(403, 'INVALID_ORIGIN', '허용되지 않은 로그인 요청입니다.');
  }
  const body = (await request.json().catch(() => null)) as {
    credential?: string;
  } | null;
  if (!body?.credential)
    return error(422, 'VALIDATION_ERROR', 'Google 인증 정보가 필요합니다.');
  const result = await createGoogleSession(body.credential);
  if (result.kind === 'not_configured')
    return error(
      503,
      'AUTH_NOT_CONFIGURED',
      'Google 로그인이 아직 설정되지 않았습니다.',
    );
  if (result.kind === 'invalid')
    return error(
      401,
      'INVALID_GOOGLE_TOKEN',
      'Google 인증 정보를 확인할 수 없습니다.',
    );
  const response = json({ signed_in: true });
  response.headers.set('Set-Cookie', sessionCookie(result.sessionToken));
  return response;
}
