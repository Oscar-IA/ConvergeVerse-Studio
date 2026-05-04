import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Root health endpoint — called by BOND Central and monitoring services. */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'bond-convergeverse-web',
    version: '0.5',
    timestamp: new Date().toISOString(),
  });
}
