import { json } from '@/lib/api';
import { deleteSession, expiredSessionCookie } from '@/lib/google-auth';

export async function POST(request: Request) {
  await deleteSession(request);
  const response = json({ signed_out: true });
  response.headers.set('Set-Cookie', expiredSessionCookie());
  return response;
}
