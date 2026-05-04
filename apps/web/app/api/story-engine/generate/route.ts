import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic    = 'force-dynamic';
export const maxDuration = 60; // seconds — required for Anthropic calls (Vercel Pro)

// ─── Types ────────────────────────────────────────────────────────────────────

interface Panel {
  scene_index: number;
  description: string;
  dialogue: string;
  image_url: null;
  image_provider: null;
}

interface Chapter {
  id: string;
  day_number: number;
  slot: number;
  title: string;
  script: string;
  panels: Panel[];
  status: 'draft';
  production_phase: 'novel';
  arc_position: string;
  symbols_planted: unknown[];
  bond_os_signals: unknown[];
  author_notes: string;
  created_at: string;
  canon_chapter_number: null;
}

interface GeneratedChapterDraft {
  title: string;
  script: string;
  arc_position: string;
  panels: Array<{ description: string; dialogue: string }>;
}

// ─── Anthropic call ───────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is not configured on this server.');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(55_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401) throw new Error('Invalid Anthropic API key.');
    if (res.status === 429) throw new Error('Anthropic rate limit reached. Try again in a moment.');
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  return data.content.find((b) => b.type === 'text')?.text ?? '';
}

// ─── Chapter builder ──────────────────────────────────────────────────────────

function buildChapter(draft: GeneratedChapterDraft, day: number, slot: number): Chapter {
  const panels: Panel[] = (draft.panels ?? []).map((p, i) => ({
    scene_index: i,
    description: p.description ?? '',
    dialogue: p.dialogue ?? '',
    image_url: null,
    image_provider: null,
  }));

  return {
    id: randomUUID(),
    day_number: day,
    slot,
    title: draft.title ?? `Chapter ${slot}`,
    script: draft.script ?? '',
    panels,
    status: 'draft',
    production_phase: 'novel',
    arc_position: draft.arc_position ?? 'rising_action',
    symbols_planted: [],
    bond_os_signals: [],
    author_notes: '',
    created_at: new Date().toISOString(),
    canon_chapter_number: null,
  };
}

// ─── Generation prompt ────────────────────────────────────────────────────────

function buildPrompt(
  day: number,
  plotIdea: string,
  toneMix: { humor: number; epic: number; strategy: number },
  backgroundLore: string,
): string {
  const toneDesc = [
    toneMix.epic > 0.4 && 'epic and action-packed',
    toneMix.humor > 0.4 && 'fun and humorous',
    toneMix.strategy > 0.4 && 'clever and strategic',
  ]
    .filter(Boolean)
    .join(', ') || 'exciting';

  return `You are a creative story writer for an anime/manga story engine. Generate exactly 3 short chapters for Day ${day} of the story.

STORY CONCEPT: ${plotIdea || 'An exciting adventure story with a young hero who discovers special powers.'}
TONE: ${toneDesc}
${backgroundLore ? `WORLD LORE: ${backgroundLore}` : ''}

RULES (keep responses SHORT and FAST):
- Each chapter: 120-180 words maximum
- Include exactly 3 manga panels per chapter
- Chapters: setup → escalation → cliffhanger
- Language: simple, exciting, suitable for all ages
- No graphic violence or adult content

Respond with ONLY valid JSON — no extra text, no markdown fences:
{"chapters":[{"title":"Chapter title","arc_position":"rising_action","script":"Story text here (120-180 words)...","panels":[{"description":"Panel 1 visual","dialogue":"Dialogue"},{"description":"Panel 2 visual","dialogue":"Dialogue"},{"description":"Panel 3 visual","dialogue":"Dialogue"}]},{"title":"Chapter 2 title","arc_position":"climax","script":"...","panels":[{"description":"...","dialogue":"..."},{"description":"...","dialogue":"..."},{"description":"...","dialogue":"..."}]},{"title":"Chapter 3 title","arc_position":"falling_action","script":"...","panels":[{"description":"...","dialogue":"..."},{"description":"...","dialogue":"..."},{"description":"...","dialogue":"..."}]}]}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_key',
        message:
          'ANTHROPIC_API_KEY is not set on this server. Add it to your Vercel environment variables.',
      },
      { status: 503 },
    );
  }

  let body: {
    generation_config?: {
      architect_plot_idea?: string;
      tone_mix?: { humor: number; epic: number; strategy: number };
      background_lore?: string;
    };
    day_number?: number;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const gc = body.generation_config ?? {};
  const plotIdea = gc.architect_plot_idea?.trim() ?? '';
  const toneMix = gc.tone_mix ?? { humor: 0.33, epic: 0.33, strategy: 0.34 };
  const backgroundLore = gc.background_lore?.trim() ?? '';
  const day = typeof body.day_number === 'number' ? body.day_number : 1;

  const prompt = buildPrompt(day, plotIdea, toneMix, backgroundLore);

  let raw: string;
  try {
    raw = await callAnthropic(prompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: 'anthropic_error', message: msg }, { status: 502 });
  }

  // Parse JSON from the response (strip markdown fences if present)
  let parsed: { chapters: GeneratedChapterDraft[] };
  try {
    const clean = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    parsed = JSON.parse(clean) as typeof parsed;
    if (!Array.isArray(parsed?.chapters)) throw new Error('No chapters array');
  } catch {
    return NextResponse.json(
      { ok: false, error: 'parse_error', message: 'Could not parse story output. Please try again.' },
      { status: 500 },
    );
  }

  const chapters: Chapter[] = parsed.chapters
    .slice(0, 3)
    .map((draft, i) => buildChapter(draft, day, i + 1));

  return NextResponse.json({
    day_number: day,
    chapters,
    count: chapters.length,
    message: `Generated ${chapters.length} chapters for day ${day}. Review and approve.`,
    generation_config_applied: gc,
    cour_context: null,
    master_generator: { enabled: false },
    mode: 'nextjs-builtin',
  });
}
