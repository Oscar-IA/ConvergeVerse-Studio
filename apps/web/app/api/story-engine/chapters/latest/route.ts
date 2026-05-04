import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/story-engine/chapters/latest
 * Returns the current day + chapters. This built-in route always returns
 * an empty state (day 0, no chapters) so the UI shows the generation form.
 * When the Python API is running, NEXT_PUBLIC_API_URL overrides this route.
 */
export async function GET() {
  return NextResponse.json({
    day_number: 0,
    chapters: [],
    cour_context: null,
    world_state: null,
    message: 'No chapters yet — generate your first story!',
  });
}
