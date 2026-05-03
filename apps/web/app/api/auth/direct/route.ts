/**
 * POST /api/auth/direct
 *
 * Local access-code gate for ConvergeVerse Studio.
 * Accepts single-app codes without requiring BOND Central.
 * On success, sets the same bond_satellite_session cookie that the
 * BOND Central callback sets, so middleware + BondCentralGuard pass.
 *
 * Also sets user-profile cookies (cv_name, cv_mode, cv_anxiety, etc.)
 * so the client can personalize the experience without a database.
 *
 * Codes: CONVERGEVERSE_ACCESS_CODES env var (comma-separated).
 * Built-in code: BOND-GERO-2026
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import { getProfileForCode, PROFILE_COOKIES } from '@/lib/userProfiles';

const SESSION_COOKIE = 'bond_satellite_session';
const TTL_SECONDS    = 8 * 60 * 60; // 8 hours

function getValidCodes(): Set<string> {
  const envCodes = process.env.CONVERGEVERSE_ACCESS_CODES ?? '';
  const extra = envCodes.split(',').map((c) => c.trim()).filter(Boolean);
  // All codes with profiles are automatically valid; env var can add more
  return new Set(['BOND-GERO-2026', ...extra]);
}

function getSecret(): string {
  return (
    process.env.CONVERGEVERSE_LOCAL_SECRET ??
    process.env.BOND_SESSION_SECRET ??
    'convergeverse-local-dev-secret-32ch'
  );
}

/** Build a simple signed token: base64url(payload).base64url(hmac-sha256) */
function signLocalToken(code: string): string {
  const nonce   = randomBytes(8).toString('hex');
  const exp     = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ nodeId: `local:${code}`, appId: 'bond-convergeverse', nonce, exp }),
  ).toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** Set a client-readable cookie (httpOnly: false) */
function setClientCookie(
  res: NextResponse,
  name: string,
  value: string,
  isProd: boolean,
) {
  res.cookies.set(name, encodeURIComponent(value), {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export async function POST(req: NextRequest) {
  let body: { code?: unknown };
  try {
    body = (await req.json()) as { code?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code) {
    return NextResponse.json({ ok: false, error: 'missing_code' }, { status: 400 });
  }

  if (!getValidCodes().has(code)) {
    return NextResponse.json({ ok: false, error: 'invalid_code' }, { status: 401 });
  }

  const token  = signLocalToken(code);
  const isProd = process.env.NODE_ENV === 'production';

  const redirectParam = req.nextUrl.searchParams.get('redirect') ?? '/';
  const safePath =
    redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/';

  // Look up user profile for this code
  const profile = getProfileForCode(code);

  const res = NextResponse.json({
    ok:       true,
    redirect: safePath,
    profile:  profile ? { name: profile.name, emoji: profile.emoji } : null,
  });

  // ── Session cookie (httpOnly — verified by middleware) ─────────────────────
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   isProd,
    sameSite: 'lax',
    path:     '/',
    maxAge:   TTL_SECONDS,
  });

  // ── Kids mode cookie (legacy — kept for backwards compat) ─────────────────
  const isKids = profile?.mode === 'kids' || profile?.mode === 'teen';
  if (isKids) {
    res.cookies.set('kids_mode', '1', {
      httpOnly: false,
      secure:   isProd,
      sameSite: 'lax',
      path:     '/',
      maxAge:   TTL_SECONDS,
    });
  }

  // ── User profile cookies (client-readable) ────────────────────────────────
  if (profile) {
    setClientCookie(res, PROFILE_COOKIES.name,    profile.name,                         isProd);
    setClientCookie(res, PROFILE_COOKIES.mode,    profile.mode,                         isProd);
    setClientCookie(res, PROFILE_COOKIES.anxiety, profile.needs.anxiety ? '1' : '0',   isProd);
    setClientCookie(res, PROFILE_COOKIES.lang,    profile.language,                     isProd);
    setClientCookie(res, PROFILE_COOKIES.emoji,   profile.emoji,                        isProd);
    // Strip leading # so the cookie value stays URL-safe
    setClientCookie(res, PROFILE_COOKIES.color,   profile.color.replace(/^#/, ''),      isProd);
  }

  return res;
}
