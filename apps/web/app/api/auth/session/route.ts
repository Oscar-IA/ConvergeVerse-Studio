/**
 * GET /api/auth/session
 *
 * Lightweight server-side endpoint for BondCentralGuard to check if the
 * current request carries a valid satellite session cookie.
 *
 * The httpOnly cookie `bond_satellite_session` cannot be read from the
 * browser — this endpoint acts as the bridge.
 */
import { NextRequest, NextResponse } from 'next/server';
import { SATELLITE_SESSION_COOKIE } from '@/lib/bond-central';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(SATELLITE_SESSION_COOKIE)?.value;
  if (!token || token.length < 10) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true }, { status: 200 });
}
