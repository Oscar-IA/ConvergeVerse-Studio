/**
 * POST /api/auth/direct
 *
 * Local access-code gate for ConvergeVerse Studio.
 * Accepts single-app codes without requiring BOND Central.
 * On success, sets the same bond_satellite_session cookie that the
 * BOND Central callback sets, so middleware + BondCentralGuard pass.
 *
 * Codes: CONVERGEVERSE_ACCESS_CODES env var (comma-separated).
 * Default code: BOND-GERO-2026
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';

const SESSION_COOKIE = 'bond_satellite_session';
const TTL_SECONDS = 8 * 60 * 60; // 8 hours

function getValidCodes(): Set<string> {
  const envCodes = process.env.CONVERGEVERSE_ACCESS_CODES ?? '';
  const extra = envCodes.split(',').map((c) => c.trim()).filter(Boolean);
  return new Set(['BOND-GERO-2026', ...extra]);
}

/** Codes that automatically enable kids mode after login */
const KIDS_CODES = new Set(['BOND-GERO-2026']);

function getSecret(): string {
  return (
    process.env.CONVERGEVERSE_LOCAL_SECRET ??
    process.env.BOND_SESSION_SECRET ??
    'convergeverse-local-dev-secret-32ch'
  );
}

/**
 * Build a simple signed token: base64(payload).base64(hmac-sha256)
 * This is not a JWT but carries enough info for the presence check.
 */
function signLocalToken(code: string): string {
  const nonce = randomBytes(8).toString('hex');
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ nodeId: `local:${code}`, appId: 'bond-convergeverse', nonce, exp }),
  ).toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export async function POST(req: NextRequest) {
  let body: { code?: unknown };
  try {
    body = (await req.json()) as { code?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) {
    return NextResponse.json({ ok: false, error: 'missing_code' }, { status: 400 });
  }

  if (!getValidCodes().has(code)) {
    return NextResponse.json({ ok: false, error: 'invalid_code' }, { status: 401 });
  }

  const token = signLocalToken(code);
  const isProd = process.env.NODE_ENV === 'production';

  const redirectParam = req.nextUrl.searchParams.get('redirect') ?? '/';
  const safePath =
    redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/';

  const res = NextResponse.json({ ok: true, redirect: safePath, kidsMode: KIDS_CODES.has(code) });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });

  // Auto-enable kids mode for kid accounts
  if (KIDS_CODES.has(code)) {
    res.cookies.set('kids_mode', '1', {
      httpOnly: false, // readable by client JS so useKidsMode can pick it up
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: TTL_SECONDS,
    });
  }

  return res;
}
