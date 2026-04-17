'use client';

import HTMLFlipBook from 'react-pageflip';
import { getChapterNovelProgress, postChapterNovelProgress } from '@/lib/api/client';
import { getApiBaseUrl } from '@/lib/config';
import type { SpellcheckUiLang } from '@/lib/spellcheck/useMultilingualSpellcheck';
import { useMultilingualSpellcheck } from '@/lib/spellcheck/useMultilingualSpellcheck';
import { SpellcheckHints } from '@/components/manga/SpellcheckHints';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const AUTOSAVE_DEBOUNCE_MS = 2500;

const PLACEHOLDER =
  'Este espacio guarda el manuscrito del capítulo. Cuando generes con el pipeline, el texto de la novela aparecerá aquí — pasá las hojas con el cursor.';

export type NovelChunkMeta =
  | { text: string; start: number; end: number; isPlaceholder?: false }
  | { text: string; start: number; end: number; isPlaceholder: true };

/** Parte el manuscrito en páginas legibles (párrafos primero, luego trozos). */
export function paginateNovel(text: string, maxChars = 820): string[] {
  return paginateNovelWithRanges(text, maxChars).map((c) => c.text);
}

/** Paginación con rangos en `text.trim()` para editar por página sin perder el manuscrito completo. */
export function paginateNovelWithRanges(raw: string, maxChars = 820): NovelChunkMeta[] {
  const cleaned = raw.trim();
  if (!cleaned) {
    return [{ text: PLACEHOLDER, start: 0, end: 0, isPlaceholder: true }];
  }

  const paras: { text: string; start: number; end: number }[] = [];
  let i = 0;
  while (i < cleaned.length) {
    while (i < cleaned.length && cleaned[i] === '\n') i++;
    if (i >= cleaned.length) break;
    const start = i;
    const double = cleaned.indexOf('\n\n', start);
    const end = double === -1 ? cleaned.length : double;
    const rawSlice = cleaned.slice(start, end);
    const t = rawSlice.trim();
    if (t.length) {
      const lead = rawSlice.length - rawSlice.trimStart().length;
      const s = start + lead;
      const e = s + t.length;
      paras.push({ text: t, start: s, end: e });
    }
    i = double === -1 ? cleaned.length : double + 2;
  }

  if (paras.length === 0 && cleaned.length) {
    let j = 0;
    while (j < cleaned.length) {
      const end = Math.min(j + maxChars, cleaned.length);
      const slice = cleaned.slice(j, end);
      paras.push({ text: slice, start: j, end });
      j = end;
    }
  }

  const chunks: NovelChunkMeta[] = [];
  let curText = '';
  let curStart = -1;
  let curEnd = -1;

  for (const p of paras) {
    const nextText = curText ? `${curText}\n\n${p.text}` : p.text;
    if (nextText.length > maxChars && curText) {
      chunks.push({ text: curText, start: curStart, end: curEnd });
      curText = p.text;
      curStart = p.start;
      curEnd = p.end;
    } else {
      curText = nextText;
      if (curStart < 0) curStart = p.start;
      curEnd = p.end;
    }
  }
  if (curText) chunks.push({ text: curText, start: curStart, end: curEnd });
  return chunks.length ? chunks : [{ text: cleaned, start: 0, end: cleaned.length }];
}

function applyChunkEdit(cleanedBase: string, chunk: NovelChunkMeta, newChunkText: string): string {
  if (chunk.isPlaceholder) return newChunkText.trim();
  const before = cleanedBase.slice(0, chunk.start);
  const after = cleanedBase.slice(chunk.end);
  return (before + newChunkText + after).trim();
}

/** Hash estable y rápido para forzar remount del flipbook (evita insertBefore con DOM que page-flip ya movió). */
function fnv1aHash(s: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

const FlipPage = forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <div ref={ref} className={className}>
      {children}
    </div>
  ),
);
FlipPage.displayName = 'FlipPage';

/** Escudo del Reino Aethel-Arévalo — cuero + cristal / neón. */
function AethelArevaloShield() {
  const rid = useId().replace(/:/g, '');
  const gFill = `lb-shield-fill-${rid}`;
  const gCrystal = `lb-crystal-${rid}`;
  const fGlow = `lb-glow-${rid}`;
  return (
    <div className="legacy-book__aethel-shield" aria-hidden>
      <svg className="legacy-book__shield-svg" viewBox="0 0 140 168" role="img">
        <title>Escudo Aethel-Arévalo</title>
        <defs>
          <linearGradient id={gFill} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a2338" />
            <stop offset="50%" stopColor="#0f1828" />
            <stop offset="100%" stopColor="#0a101c" />
          </linearGradient>
          <linearGradient id={gCrystal} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#00fff7" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#7b6cff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#e8f4ff" stopOpacity="0.9" />
          </linearGradient>
          <filter id={fGlow} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M70 6 L118 32 L118 88 Q118 128 70 162 Q22 128 22 88 L22 32 Z"
          fill={`url(#${gFill})`}
          stroke="#c9a227"
          strokeWidth="2.5"
          filter={`url(#${fGlow})`}
        />
        <path
          d="M70 28 L98 44 L92 78 L70 118 L48 78 L42 44 Z"
          fill={`url(#${gCrystal})`}
          stroke="rgba(0,255,247,0.6)"
          strokeWidth="1"
        />
        <path d="M70 44 L70 98 M52 62 L88 80 M88 62 L52 80" stroke="rgba(0,255,247,0.35)" strokeWidth="0.8" />
        <text
          x="70"
          y="132"
          textAnchor="middle"
          fill="#c9a227"
          fontSize="8"
          style={{ fontFamily: 'Cinzel, Palatino Linotype, serif' }}
          letterSpacing="0.12em"
        >
          AETHEL-ARÉVALO
        </text>
      </svg>
    </div>
  );
}

const FLIP_PROPS = {
  startPage: 0,
  size: 'stretch' as const,
  width: 380,
  height: 520,
  minWidth: 280,
  maxWidth: 520,
  minHeight: 380,
  maxHeight: 720,
  drawShadow: true,
  flippingTime: 900,
  usePortrait: true,
  startZIndex: 0,
  autoSize: true,
  maxShadowOpacity: 0.55,
  showCover: true,
  mobileScrollSupport: true,
  clickEventForward: false,
  useMouseEvents: true,
  swipeDistance: 30,
  showPageCorners: true,
  disableFlipByClick: false,
};

export type LegacyBookProps = {
  novelText: string;
  /** Si se pasa, las ediciones y la carga desde API actualizan la novela en el padre (p. ej. pestaña Novela final). */
  onNovelTextChange?: (next: string) => void;
  className?: string;
  chapterNumber?: number;
  seasonFolder?: string;
  chapterTitle?: string | null;
  /** Si true y el texto local está vacío, aplica `novel_text` del backend al montar / cambiar capítulo. */
  hydrateFromBackendWhenEmpty?: boolean;
  spellLang?: SpellcheckUiLang;
};

async function saveNovelToApi(
  chapterNumber: number,
  novelText: string,
  seasonFolder: string,
  chapterTitle: string | null | undefined,
): Promise<void> {
  await postChapterNovelProgress({
    chapter_number: chapterNumber,
    novel_text: novelText,
    season_folder: seasonFolder,
    chapter_title: chapterTitle,
  });
}

function saveNovelKeepalive(
  chapterNumber: number,
  novelText: string,
  seasonFolder: string,
  chapterTitle: string | null | undefined,
): void {
  const base = getApiBaseUrl();
  try {
    fetch(`${base}/api/chapters/novel-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapter_number: chapterNumber,
        novel_text: novelText,
        season_folder: seasonFolder,
        chapter_title: chapterTitle ?? null,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function LegacyBook({
  novelText,
  onNovelTextChange,
  className,
  chapterNumber = 1,
  seasonFolder = 'season_1',
  chapterTitle,
  hydrateFromBackendWhenEmpty = true,
  spellLang = 'auto',
}: LegacyBookProps) {
  const bookRef = useRef<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void } | null }>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'ok' | 'miss' | 'err'>('idle');
  const textRef = useRef(novelText);
  const lastSavedRef = useRef('');
  const hydratedKeyRef = useRef<string>('');

  const { runSpellcheckOnBlur, spellStatus, clearSpellStatus } = useMultilingualSpellcheck(spellLang);

  const cleaned = useMemo(() => novelText.trim(), [novelText]);
  const chunkMetas = useMemo(() => paginateNovelWithRanges(novelText), [novelText]);

  /**
   * react-pageflip / StPageFlip reubica nodos en el DOM; si React reconcilia hijos sobre esa
   * estructura, aparece insertBefore NotFoundError. Remount completo al cambiar el manuscrito.
   */
  const flipBookMountKey = useMemo(
    () => `lb-${chapterNumber}-${fnv1aHash(novelText)}`,
    [chapterNumber, novelText],
  );

  useEffect(() => {
    textRef.current = novelText;
  }, [novelText]);

  useEffect(() => {
    lastSavedRef.current = '';
  }, [chapterNumber]);

  useEffect(() => {
    hydratedKeyRef.current = '';
  }, [chapterNumber, seasonFolder]);

  const pushText = useCallback(
    (next: string) => {
      onNovelTextChange?.(next);
    },
    [onNovelTextChange],
  );

  /* Cargar capítulo guardado en backend (una vez por capítulo / temporada; no atar a cada tecla) */
  useEffect(() => {
    if (!chapterNumber || chapterNumber < 1) return;
    const key = `${seasonFolder}:${chapterNumber}`;
    let cancelled = false;
    setLoadStatus('loading');

    void (async () => {
      try {
        const data = await getChapterNovelProgress({
          chapter_number: chapterNumber,
          season_folder: seasonFolder,
        });
        if (cancelled) return;
        const remote = (data.novel_text ?? '').trim();
        setLoadStatus(remote ? 'ok' : 'miss');
        if (!remote) return;

        const localEmpty = !textRef.current.trim();
        const shouldHydrateEmpty = hydrateFromBackendWhenEmpty && localEmpty;
        const notYetForThisKey = hydratedKeyRef.current !== key;
        if (shouldHydrateEmpty && notYetForThisKey) {
          hydratedKeyRef.current = key;
          pushText(data.novel_text ?? '');
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof Error && e.message === 'NOT_FOUND') {
          setLoadStatus('miss');
          return;
        }
        setLoadStatus('err');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chapterNumber, seasonFolder, hydrateFromBackendWhenEmpty, pushText]);

  const onFlip = useCallback((e: { data: number }) => {
    setPageIndex(typeof e.data === 'number' ? e.data : 0);
  }, []);

  const onInit = useCallback((e: { data: number }) => {
    setPageIndex(e.data ?? 0);
  }, []);

  useEffect(() => {
    setPageCount(2 + chunkMetas.length);
  }, [chunkMetas.length]);

  useEffect(() => {
    if (!chapterNumber || chapterNumber < 1) return;
    const trimmed = novelText.trim();
    if (!trimmed) return;
    if (trimmed === lastSavedRef.current) return;

    const t = window.setTimeout(() => {
      setSaveStatus('saving');
      void saveNovelToApi(chapterNumber, novelText, seasonFolder, chapterTitle)
        .then(() => {
          lastSavedRef.current = trimmed;
          setSaveStatus('saved');
          window.setTimeout(() => setSaveStatus('idle'), 2000);
        })
        .catch(() => {
          setSaveStatus('error');
          window.setTimeout(() => setSaveStatus('idle'), 4000);
        });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [novelText, chapterNumber, seasonFolder, chapterTitle]);

  useEffect(() => {
    return () => {
      const t = textRef.current.trim();
      if (chapterNumber >= 1 && t && t !== lastSavedRef.current) {
        saveNovelKeepalive(chapterNumber, textRef.current, seasonFolder, chapterTitle);
      }
    };
  }, [chapterNumber, seasonFolder, chapterTitle]);

  const reloadFromServer = useCallback(() => {
    void (async () => {
      setLoadStatus('loading');
      try {
        const data = await getChapterNovelProgress({
          chapter_number: chapterNumber,
          season_folder: seasonFolder,
        });
        const remote = data.novel_text ?? '';
        pushText(remote);
        setLoadStatus(remote.trim() ? 'ok' : 'miss');
        hydratedKeyRef.current = `${seasonFolder}:${chapterNumber}`;
      } catch (e) {
        if (e instanceof Error && e.message === 'NOT_FOUND') setLoadStatus('miss');
        else setLoadStatus('err');
      }
    })();
  }, [chapterNumber, seasonFolder, pushText]);

  const handlePageEdit = useCallback(
    (chunk: NovelChunkMeta, value: string) => {
      const next = applyChunkEdit(cleaned, chunk, value);
      pushText(next);
      if (spellStatus.state !== 'idle') clearSpellStatus();
    },
    [cleaned, pushText, spellStatus.state, clearSpellStatus],
  );

  const spellcheckFullManuscript = useCallback(() => {
    void runSpellcheckOnBlur(novelText, (next) => pushText(next));
  }, [novelText, runSpellcheckOnBlur, pushText]);

  const onPageBlurSpellcheck = useCallback(() => {
    void runSpellcheckOnBlur(novelText, (next) => pushText(next));
  }, [novelText, runSpellcheckOnBlur, pushText]);

  return (
    <section
      className={`legacy-book ${className ?? ''}`.trim()}
      aria-label="Libro Real: manuscrito con pasar página"
    >
      <div className="legacy-book__toolbar font-datum">
        <span className="legacy-book__toolbar-label">LIBRO REAL</span>
        <span className="legacy-book__toolbar-hint">
          Pasar página con el cursor · Para escribir largo sin que el libro se reinicie, usá el cuadro de novela arriba; las hojas se
          actualizan al cambiar el texto.
        </span>
        <div className="legacy-book__toolbar-actions">
          <span className="legacy-book__autosave-pill font-datum" aria-live="polite">
            {loadStatus === 'loading' && 'Sincronizando crónica…'}
            {loadStatus === 'ok' && 'Manuscrito en servidor'}
            {loadStatus === 'miss' && 'Sin archivo previo en API'}
            {loadStatus === 'err' && 'Error leyendo API'}
            {loadStatus === 'idle' && '—'}
            {' · '}
            {saveStatus === 'saving' && 'Guardando…'}
            {saveStatus === 'saved' && `Guardado cap_${chapterNumber}_novela.json`}
            {saveStatus === 'error' && 'Sin guardar (API)'}
            {saveStatus === 'idle' && `Crónica: ${seasonFolder}/`}
          </span>
          <button type="button" className="legacy-book__nav-btn" onClick={reloadFromServer} title="Sobrescribe con el JSON del servidor">
            Recargar
          </button>
          <button type="button" className="legacy-book__nav-btn" onClick={spellcheckFullManuscript}>
            Corregir todo
          </button>
          <button type="button" className="legacy-book__nav-btn" onClick={() => bookRef.current?.pageFlip()?.flipPrev()}>
            ← Anterior
          </button>
          <span className="legacy-book__page-indicator">
            {pageCount > 0 ? `${pageIndex + 1} / ${pageCount}` : '—'}
          </span>
          <button type="button" className="legacy-book__nav-btn" onClick={() => bookRef.current?.pageFlip()?.flipNext()}>
            Siguiente →
          </button>
        </div>
      </div>

      <SpellcheckHints status={spellStatus} />

      <div className="legacy-book__stage">
        <HTMLFlipBook
          key={flipBookMountKey}
          ref={bookRef}
          {...FLIP_PROPS}
          className="legacy-book__flip-root"
          style={{}}
          onFlip={onFlip}
          onInit={onInit}
        >
          <FlipPage className="legacy-book__sheet legacy-book__sheet--cover legacy-book__sheet--leather">
            <div className="legacy-book__cover-inner">
              <div className="legacy-book__leather-grain" aria-hidden />
              <div className="legacy-book__cover-ornament legacy-book__cover-ornament--tl" />
              <div className="legacy-book__cover-ornament legacy-book__cover-ornament--br" />
              <AethelArevaloShield />
              <p className="legacy-book__cover-series font-cinzel">CONVERGEVERSE</p>
              <h2 className="legacy-book__cover-title font-cinzel">EL LEGADO LAGUNA</h2>
              <p className="legacy-book__cover-sub font-inter">Reino Aethel-Arévalo · Archivo del Nexo</p>
            </div>
          </FlipPage>

          {chunkMetas.map((chunk, i) => (
            <FlipPage key={`page-${i}`} className="legacy-book__sheet legacy-book__sheet--parchment">
              <div className="legacy-book__parchment-inner">
                <div className="legacy-book__parchment-glow" aria-hidden />
                <p className="legacy-book__page-meta font-cinzel">Capítulo · hoja {i + 1}</p>
                <textarea
                  className="legacy-book__page-body legacy-book__page-body--edit font-inter"
                  value={chunk.text}
                  onChange={(e) => handlePageEdit(chunk, e.target.value)}
                  onBlur={onPageBlurSpellcheck}
                  spellCheck={false}
                  aria-label={`Texto narrativo, hoja ${i + 1}`}
                />
              </div>
            </FlipPage>
          ))}

          <FlipPage className="legacy-book__sheet legacy-book__sheet--back">
            <div className="legacy-book__back-inner font-cinzel">
              <span className="legacy-book__back-sig">CV</span>
              <p className="legacy-book__back-line">FIN DEL TOMO</p>
            </div>
          </FlipPage>
        </HTMLFlipBook>
      </div>
    </section>
  );
}
