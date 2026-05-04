import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  return NextResponse.json({
    status: 'ok',
    mode: 'nextjs-builtin',
    anthropic: hasKey ? 'ready' : 'missing_key',
  });
}
