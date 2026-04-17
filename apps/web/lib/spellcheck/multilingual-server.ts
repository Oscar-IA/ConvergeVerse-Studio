import 'server-only';

import { createRequire } from 'node:module';
import { franc } from 'franc-min';

export type SpellLang = 'es' | 'en' | 'fr';

type NSpellInstance = {
  correct: (w: string) => boolean;
  suggest: (w: string) => string[];
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nspell = require('nspell') as (dict: { aff: Buffer | Uint8Array; dic: Buffer | Uint8Array }) => NSpellInstance;

const nodeRequire = createRequire(import.meta.url);

const spellers: Partial<Record<SpellLang, NSpellInstance>> = {};

function loadEnUs(): Promise<{ aff: Buffer; dic: Buffer }> {
  const load = nodeRequire('dictionary-en-us') as (
    cb: (err: Error | null, d: { aff: Buffer; dic: Buffer }) => void,
  ) => void;
  return new Promise((resolve, reject) => {
    load((err: Error | null, d: { aff: Buffer; dic: Buffer }) => {
      if (err) reject(err);
      else resolve(d);
    });
  });
}

async function ensureSpeller(lang: SpellLang): Promise<NSpellInstance> {
  if (spellers[lang]) return spellers[lang]!;

  if (lang === 'es') {
    const mod = await import('dictionary-es');
    spellers.es = nspell(mod.default);
    return spellers.es;
  }
  if (lang === 'fr') {
    const mod = await import('dictionary-fr');
    spellers.fr = nspell(mod.default);
    return spellers.fr;
  }
  const d = await loadEnUs();
  spellers.en = nspell(d);
  return spellers.en;
}

/** Map ISO 639-3 from franc-min to our dictionary set (es | en | fr). */
function mapFrancToLang(code: string): SpellLang | null {
  if (code === 'spa' || code === 'cat' || code === 'glg' || code === 'eus') return 'es';
  if (code === 'eng') return 'en';
  if (code === 'fra' || code === 'oci' || code === 'nrf' || code === 'frm' || code === 'fro') return 'fr';
  return null;
}

const WORD_RE = /[\p{L}\p{M}]+/gu;

function tokenizeIndices(text: string): { word: string; start: number; end: number }[] {
  const out: { word: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(WORD_RE.source, WORD_RE.flags);
  while ((m = re.exec(text)) !== null) {
    out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function matchCase(suggestion: string, original: string): string {
  if (original === original.toUpperCase() && original.length > 1) return suggestion.toUpperCase();
  if (original[0] === original[0].toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1).toLowerCase();
  }
  return suggestion;
}

function safeSuggest(sp: NSpellInstance, w: string): string[] {
  try {
    const raw = sp.suggest(w);
    if (raw == null) return [];
    return Array.isArray(raw) ? [...raw] : [];
  } catch {
    return [];
  }
}

async function pickLangBySpellScore(text: string): Promise<SpellLang> {
  const tokens = tokenizeIndices(text)
    .map((t) => t.word)
    .filter((w) => w.length >= 2)
    .slice(0, 220);
  if (tokens.length === 0) return 'en';

  const langs: SpellLang[] = ['es', 'en', 'fr'];
  let best: SpellLang = 'en';
  let bestRatio = -1;

  for (const lang of langs) {
    const sp = await ensureSpeller(lang);
    let ok = 0;
    for (const w of tokens) {
      if (sp.correct(w) || sp.correct(w.toLowerCase())) ok++;
    }
    const ratio = ok / tokens.length;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = lang;
    }
  }
  return best;
}

/**
 * Idioma dominante: franc-min si es fiable; si `und` o corto, vota con ratio de aciertos
 * contra los tres diccionarios.
 */
export async function detectDominantLang(text: string): Promise<SpellLang> {
  const trimmed = text.trim();
  if (trimmed.length < 8) return 'en';

  const code = franc(trimmed, { minLength: 3 });
  const mapped = mapFrancToLang(code);
  if (mapped && code !== 'und') return mapped;

  return pickLangBySpellScore(trimmed);
}

export type SpellMistake = {
  word: string;
  start: number;
  end: number;
  suggestions: string[];
};

export type SpellcheckResult = {
  detectedLang: SpellLang;
  mistakes: SpellMistake[];
  correctedText: string;
  replacementCount: number;
};

export async function spellcheckText(
  text: string,
  autocorrect: boolean,
  options?: { lang?: SpellLang },
): Promise<SpellcheckResult> {
  const lang =
    options?.lang && (options.lang === 'es' || options.lang === 'en' || options.lang === 'fr')
      ? options.lang
      : await detectDominantLang(text);
  const spell = await ensureSpeller(lang);

  const tokens = tokenizeIndices(text);
  const replacements: { start: number; end: number; replacement: string; word: string }[] = [];

  for (const { word, start, end } of tokens) {
    if (word.length < 2) continue;

    if (spell.correct(word)) continue;

    const lower = word.toLowerCase();
    if (word !== lower && spell.correct(lower)) continue;

    let suggestions = safeSuggest(spell, word);
    if (suggestions.length === 0 && word !== lower) {
      suggestions = safeSuggest(spell, lower);
    }

    if (autocorrect && suggestions.length > 0) {
      const rep = matchCase(suggestions[0], word);
      if (rep !== word) {
        replacements.push({ start, end, replacement: rep, word });
      }
    }
  }

  let correctedText = text;
  if (autocorrect && replacements.length > 0) {
    replacements.sort((a, b) => b.start - a.start);
    for (const r of replacements) {
      correctedText = correctedText.slice(0, r.start) + r.replacement + correctedText.slice(r.end);
    }
  }

  // Errores que siguen en el texto final (para resaltado / sugerencias en UI)
  const mistakesFinal: SpellMistake[] = [];
  for (const { word, start, end } of tokenizeIndices(correctedText)) {
    if (word.length < 2) continue;
    if (spell.correct(word)) continue;
    const lower = word.toLowerCase();
    if (word !== lower && spell.correct(lower)) continue;
    const suggestions = safeSuggest(spell, word);
    const more = suggestions.length === 0 && word !== lower ? safeSuggest(spell, lower) : [];
    const merged = suggestions.length ? suggestions : more;
    if (merged.length === 0) continue;
    mistakesFinal.push({ word, start, end, suggestions: merged.slice(0, 8) });
  }

  return {
    detectedLang: lang,
    mistakes: mistakesFinal,
    correctedText,
    replacementCount: replacements.length,
  };
}
