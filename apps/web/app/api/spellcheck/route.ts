import { NextResponse } from 'next/server';

import { spellcheckText } from '@/lib/spellcheck/multilingual-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_CHARS = 32_000;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      text?: string;
      autocorrect?: boolean;
      /** Forzar diccionario es | en | fr (Control Total) */
      lang?: string;
    };
    const text = typeof body.text === 'string' ? body.text : '';
    const autocorrect = body.autocorrect !== false;
    const forced =
      body.lang === 'es' || body.lang === 'en' || body.lang === 'fr' ? body.lang : undefined;

    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { error: `Texto demasiado largo (máx. ${MAX_CHARS} caracteres)` },
        { status: 400 },
      );
    }

    if (!text.trim()) {
      return NextResponse.json({
        detectedLang: 'en',
        mistakes: [],
        correctedText: text,
        replacementCount: 0,
      });
    }

    const result = await spellcheckText(text, autocorrect, forced ? { lang: forced } : undefined);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[spellcheck]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Spellcheck failed' },
      { status: 500 },
    );
  }
}
