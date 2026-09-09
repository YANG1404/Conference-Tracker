import { error, json } from '@/lib/api';
import {
  ensureUser,
  readAuthenticatedUser,
  requireAdmin,
} from '@/lib/conference-repository';

export async function GET(request: Request) {
  const user = readAuthenticatedUser(request.headers);
  if (!user) return error(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  const account = await ensureUser(user);
  const admin = await requireAdmin(user);
  return json({
    ...account,
    role: admin ? 'ADMIN' : account.role,
    is_admin: Boolean(admin),
  });
}
