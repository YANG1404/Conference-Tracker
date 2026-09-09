import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';

const SESSION_COOKIE = 'ct_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export type AppUser = {
  id: number;
  externalUserId: string;
  email: string;
  displayName: string;
  profileImageUrl: string | null;
  role: 'MEMBER' | 'ADMIN';
  status: string;
  createdAt: string;
};

type GoogleTokenInfo = {
  sub?: string;
  aud?: string;
  iss?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  exp?: string;
};

function db(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable.');
  return env.DB;
}

export function googleClientId() {
  return env.GOOGLE_CLIENT_ID ?? '';
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const item = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

export async function getSessionUser(
  request: Request,
): Promise<AppUser | null> {
  return getSessionUserFromCookie(request.headers.get('cookie'));
}

export async function getRepositoryUser(request: Request) {
  const user = await getSessionUser(request);
  return user
    ? { externalUserId: user.externalUserId, email: user.email }
    : null;
}

export async function getPageSessionUser(): Promise<AppUser | null> {
  const requestHeaders = await headers();
  return getSessionUserFromCookie(requestHeaders.get('cookie'));
}

async function getSessionUserFromCookie(
  cookieHeader: string | null,
): Promise<AppUser | null> {
  const token = cookieValue(cookieHeader, SESSION_COOKIE);
  if (!token) return null;
  const row = await db()
    .prepare(`
      SELECT u.id, u.external_user_id, u.email, u.display_name, u.profile_image_url,
        u.role, u.status, u.created_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
    `)
    .bind(token)
    .first<Record<string, unknown>>();
  if (!row || row.status !== 'ACTIVE') return null;
  return {
    id: Number(row.id),
    externalUserId: String(row.external_user_id),
    email: String(row.email),
    displayName: String(row.display_name || row.email),
    profileImageUrl:
      typeof row.profile_image_url === 'string' ? row.profile_image_url : null,
    role: row.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
    status: String(row.status),
    createdAt: String(row.created_at),
  };
}

export function isAdminUser(user: AppUser | null) {
  if (!user || user.status !== 'ACTIVE') return false;
  const allowlist = (env.CONFERENCE_TRACKER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return user.role === 'ADMIN' || allowlist.includes(user.email.toLowerCase());
}

export async function createGoogleSession(credential: string) {
  const clientId = googleClientId();
  if (!clientId) return { kind: 'not_configured' as const };
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );
  if (!response.ok) return { kind: 'invalid' as const };
  const token = (await response.json()) as GoogleTokenInfo;
  const expiresAt = Number(token.exp ?? 0);
  if (
    !token.sub ||
    !token.email ||
    token.email_verified !== 'true' ||
    token.aud !== clientId ||
    !['accounts.google.com', 'https://accounts.google.com'].includes(
      token.iss ?? '',
    ) ||
    expiresAt * 1000 <= Date.now()
  ) {
    return { kind: 'invalid' as const };
  }

  const externalUserId = `google:${token.sub}`;
  const existing = await db()
    .prepare(
      'SELECT id FROM users WHERE external_user_id = ? OR lower(email) = lower(?) LIMIT 1',
    )
    .bind(externalUserId, token.email)
    .first<{ id: number }>();
  let userId: number;
  if (existing) {
    userId = existing.id;
    await db()
      .prepare(`
        UPDATE users
        SET external_user_id = ?, email = ?, display_name = ?, profile_image_url = ?, auth_provider = 'GOOGLE', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        externalUserId,
        token.email,
        token.name ?? token.email,
        token.picture ?? null,
        userId,
      )
      .run();
  } else {
    const created = await db()
      .prepare(`
        INSERT INTO users (external_user_id, email, display_name, profile_image_url, auth_provider, role, status)
        VALUES (?, ?, ?, ?, 'GOOGLE', 'MEMBER', 'ACTIVE') RETURNING id
      `)
      .bind(
        externalUserId,
        token.email,
        token.name ?? token.email,
        token.picture ?? null,
      )
      .first<{ id: number }>();
    if (!created) throw new Error('사용자 생성에 실패했습니다.');
    userId = created.id;
  }

  const sessionToken =
    `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '');
  await db()
    .prepare(
      "INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))",
    )
    .bind(sessionToken, userId)
    .run();
  return { kind: 'ok' as const, sessionToken };
}

export async function deleteSession(request: Request) {
  const token = cookieValue(request.headers.get('cookie'), SESSION_COOKIE);
  if (token)
    await db()
      .prepare('DELETE FROM user_sessions WHERE token = ?')
      .bind(token)
      .run();
}

export function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

export function expiredSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
