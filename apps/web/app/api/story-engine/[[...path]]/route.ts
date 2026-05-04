import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Catch-all stub for story-engine endpoints not yet implemented in Next.js.
 * Returns sensible empty responses so the UI doesn't crash.
 * The Python API (NEXT_PUBLIC_API_URL=http://localhost:8000) handles these
 * with full Supabase-backed logic when running locally.
 */

const EMPTY_RESPONSES: Record<string, unknown> = {
  'world-state':           { world_state: null },
  'visual-master-prompt':  { prompt: null },
  'timeline-events':       { events: [] },
  'architect-plot-notes':  { notes: [] },
  'chapters':              { chapters: [], day_number: 0 },
};

function pathKey(segments: string[]): string {
  return segments.join('/');
}

function getEmptyResponse(segments: string[]): unknown {
  const key = pathKey(segments);
  // Check exact match first
  if (key in EMPTY_RESPONSES) return EMPTY_RESPONSES[key];
  // Check first segment
  const first = segments[0] ?? '';
  if (first in EMPTY_RESPONSES) return EMPTY_RESPONSES[first];
  return { ok: true, data: null };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { path?: string[] } },
) {
  const segments = params.path ?? [];
  return NextResponse.json(getEmptyResponse(segments));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path?: string[] } },
) {
  const segments = params.path ?? [];
  const key = pathKey(segments);

  // approve / finalize / learn / edit — just acknowledge
  if (['approve', 'finalize', 'learn', 'edit'].some((k) => key.includes(k))) {
    return NextResponse.json({ ok: true, mode: 'nextjs-stub' });
  }

  // architect-plot-notes POST — acknowledge the note was received
  if (key.includes('architect-plot-notes')) {
    let body: Record<string, unknown> = {};
    try { body = await req.json() as typeof body; } catch { /* ignore */ }
    return NextResponse.json({
      ok: true,
      id: crypto.randomUUID(),
      raw_plot_idea: body.raw_plot_idea ?? '',
      is_processed: false,
      mode: 'nextjs-stub',
    });
  }

  return NextResponse.json({ ok: true, mode: 'nextjs-stub' });
}
