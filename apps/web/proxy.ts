import { NextRequest, NextResponse } from 'next/server';
import { getCentralUrl } from './lib/bond-central';

// ─── BOND Central satellite gating ───────────────────────────────────────────
const SATELLITE_SESSION_COOKIE = 'bond_satellite_session';
const BOND_AUTH_PATH = '/bond-auth';
const PUBLIC_PATHS = [BOND_AUTH_PATH, '/bond-auth/callback', '/api/'];

function isSatelliteSessionValid(req: NextRequest): boolean {
  const token = req.cookies.get(SATELLITE_SESSION_COOKIE)?.value;
  if (!token || token.length < 10) return false;
  // Token format: base64url payload — presence check only (JWT verified server-side in API routes)
  return true;
}

const SUPPORTED_LOCALES = ['en', 'es', 'fr'] as const;
const DEFAULT_LOCALE = 'en';
const LOCALE_COOKIE = 'bond_lang';

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve locale from cookie first, then Accept-Language header.
 * Falls back to DEFAULT_LOCALE. No URL-prefix rewriting — cookie-only.
 */
function resolveLocale(req: NextRequest): SupportedLocale {
  // 1. Explicit cookie set by LanguageSelector
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Accept-Language header (first matching tag wins)
  const acceptLang = req.headers.get('accept-language') ?? '';
  for (const segment of acceptLang.split(',')) {
    const tag = segment.trim().split(';')[0].trim().toLowerCase();
    // Match full tag or just the primary subtag (e.g. "fr-CA" → "fr")
    if (isSupportedLocale(tag)) return tag;
    const primary = tag.split('-')[0];
    if (isSupportedLocale(primary)) return primary;
  }

  return DEFAULT_LOCALE;
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Token in URL → pipe straight to /bond-auth/callback ──────────────────
  // BOND Studios (or any satellite launcher) passes ?token=xxx[&central=xxx].
  // If the middleware were to redirect to /bond-auth first, the token would be
  // stripped from the URL. Detect it here and forward immediately so the
  // callback can set the httpOnly cookie in one round-trip.
  const incomingToken = req.nextUrl.searchParams.get('token');
  if (incomingToken && !pathname.startsWith('/bond-auth')) {
    const callbackUrl = req.nextUrl.clone();
    callbackUrl.pathname = '/bond-auth/callback';

    // Preserve or supply the central URL
    if (!callbackUrl.searchParams.get('central')) {
      callbackUrl.searchParams.set('central', getCentralUrl());
    }

    // Build a clean redirect path (without token/central params)
    const cleanPath = req.nextUrl.clone();
    cleanPath.searchParams.delete('token');
    cleanPath.searchParams.delete('central');
    callbackUrl.searchParams.set(
      'redirect',
      cleanPath.pathname + (cleanPath.search || ''),
    );

    return NextResponse.redirect(callbackUrl);
  }

  // ── Normal session gate ────────────────────────────────────────────────────
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!isPublic && !isSatelliteSessionValid(req)) {
    const authUrl = req.nextUrl.clone();
    authUrl.pathname = BOND_AUTH_PATH;
    authUrl.searchParams.set('central', getCentralUrl());
    authUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(authUrl);
  }

  // ── Locale injection ───────────────────────────────────────────────────────
  const locale = resolveLocale(req);
  const response = NextResponse.next();

  // Forward the resolved locale to server components via a request header
  // so next-intl's getLocale() can read it.
  response.headers.set('x-bond-locale', locale);

  // Persist the locale in the cookie so subsequent requests are consistent
  // even when Accept-Language differs (e.g. proxied requests).
  if (!req.cookies.get(LOCALE_COOKIE)?.value) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  // Run on every route except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
