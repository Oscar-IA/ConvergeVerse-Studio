'use client';

import { ArchitectsQuillPanel, EXAMPLE_BEAT } from '@/components/manga/ArchitectsQuillPanel';
import { MangaReader } from '@/components/manga/MangaReader';
import { SpellcheckHints } from '@/components/manga/SpellcheckHints';
import { TelemetryBar } from '@/components/manga/TelemetryBar';
import type { DirectorBundle } from '@/lib/directors-cut/history';
import {
  currentStorageKey,
  loadDirectorBundle,
  LOCAL_DRAFT_KEY,
  saveDirectorBundle,
  storageKeyForChapter,
} from '@/lib/directors-cut/history';
import {
  getLoreInventory,
  getWorldEngineChapter,
  getWorldEngineLibrary,
  postMangaPipeline,
  postWorldEnginePipeline,
} from '@/lib/api/client';
import type {
  LoreInventoryResponse,
  MangaPanel,
  MangaPipelineResponse,
  WorldEngineLibraryChapter,
  WorldEngineLibrarySeason,
  WorldEnginePipelineResponse,
} from '@/lib/api/types';
import type { SpellcheckUiLang } from '@/lib/spellcheck/useMultilingualSpellcheck';
import { useMultilingualSpellcheck } from '@/lib/spellcheck/useMultilingualSpellcheck';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Mismo tipo que escucha `app/manga/embed/page.tsx`. */
const MANGA_PANELS_POST_TYPE = 'MANGA_PANELS' as const;

const LegacyBook = dynamic(
  () => import('@/components/LegacyBook').then((m) => ({ default: m.LegacyBook })),
  {
    ssr: false,
    loading: () => (
      <p className="font-datum legacy-book__loading-msg" style={{ marginTop: '1rem' }}>
        Cargando Book Viewer…
      </p>
    ),
  },
);

type EditorTab = 'draft' | 'novel_final' | 'manga_script';

function bundleFromManga(
  data: MangaPipelineResponse,
  workspace: string,
  meta: { seasonSlug: string; chapterNumber: number; seasonNumber: number } | null,
): DirectorBundle {
  return {
    workspaceSnapshot: workspace,
    novel: data.novel ?? workspace,
    script: data.script ?? '',
    panels: data.panels ?? [],
    animeMotion: data.anime_motion,
    animationMetadata: data.animation_metadata ?? null,
    source: 'manga',
    spellcheck: data.spellcheck,
    persistedPath: data.persisted_path ?? null,
    productionDir: data.production_dir ?? null,
    savedAt: new Date().toISOString(),
    seasonSlug: meta?.seasonSlug,
    chapterNumber: meta?.chapterNumber,
  };
}

function bundleFromWorld(
  data: WorldEnginePipelineResponse,
  workspace: string,
  meta: { seasonSlug: string; chapterNumber: number; seasonNumber: number } | null,
): DirectorBundle {
  return {
    workspaceSnapshot: workspace,
    novel: data.novel ?? workspace,
    script: data.script ?? '',
    panels: data.panels ?? [],
    worldVfx: data.anime_vfx,
    source: 'world',
    savedAt: new Date().toISOString(),
    seasonSlug: meta?.seasonSlug,
    chapterNumber: meta?.chapterNumber,
  };
}

function buildBeatPayload(novel: string, aiDirective: string): string {
  const t = novel.trim();
  const d = aiDirective.trim();
  if (!d) return t;
  return `${t}\n\n——— DIRECTIVA DE PRODUCCIÓN (IA) ———\n${d}`;
}

const AI_QUICK_ACTIONS: { label: string; text: string }[] = [
  {
    label: 'Más chistoso',
    text: 'Haz este capítulo más chistoso: más reacciones exageradas, roasts entre NPCs y pánico absurdo estilo Konosuba sin perder el drama épico.',
  },
  {
    label: 'Armadura / look de Aren',
    text: 'Ajusta el diseño visual de Aren: académico del Archivo, túnica índigo con ribetes plateados desgastados, gafas con reflejo azul suave, sin armadura de placas; mantén coherencia en todos los paneles.',
  },
  {
    label: 'Más oscuro / Abismo',
    text: 'Refuerza la estética Abyssal Domain: niebla biótica, ruinas invertidas, UI holográfica rota; tensión cósmica más pesada.',
  },
  {
    label: 'Neo-Aethel / neón',
    text: 'Desplaza el tono visual hacia Neo-Aethel: brutalismo cristalino, neón sobre hormigón mojado, carteles corporativos-culto.',
  },
  {
    label: 'Beat · Pluma del Arquitecto',
    text: EXAMPLE_BEAT,
  },
];

const SPELL_LANGS: { id: SpellcheckUiLang; label: string }[] = [
  { id: 'auto', label: 'AUTO' },
  { id: 'es', label: 'ES' },
  { id: 'en', label: 'EN' },
  { id: 'fr', label: 'FR' },
];

export function MangaStudio() {
  const [library, setLibrary] = useState<WorldEngineLibrarySeason[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<LoreInventoryResponse | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<{
    seasonSlug: string;
    chapterNumber: number;
    title: string | null;
    seasonNumber: number;
  } | null>(null);

  const [novelText, setNovelText] = useState('');
  const [aiDirective, setAiDirective] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingSec, setLoadingSec] = useState(0);
  const [runMode, setRunMode] = useState<'manga' | 'world' | null>(null);
  const [mangaResult, setMangaResult] = useState<MangaPipelineResponse | null>(null);
  const [worldResult, setWorldResult] = useState<WorldEnginePipelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persistNextRun, setPersistNextRun] = useState(false);

  const [editorTab, setEditorTab] = useState<EditorTab>('draft');
  const [spellLang, setSpellLang] = useState<SpellcheckUiLang>('auto');
  const [directorBundle, setDirectorBundle] = useState<DirectorBundle | null>(null);
  const lastSavedJson = useRef<string>('');

  const { runSpellcheckOnBlur, spellStatus, clearSpellStatus } = useMultilingualSpellcheck(spellLang);

  const refreshLibrary = useCallback(async () => {
    try {
      const res = await getWorldEngineLibrary();
      setLibrary(res.seasons ?? []);
      setLibraryError(null);
    } catch (e) {
      setLibrary([]);
      setLibraryError(e instanceof Error ? e.message : 'No se pudo cargar la biblioteca');
    }
  }, []);

  const refreshInventory = useCallback(async () => {
    try {
      const res = await getLoreInventory();
      setInventory(res);
      setInventoryError(null);
    } catch (e) {
      setInventory(null);
      setInventoryError(e instanceof Error ? e.message : 'Inventario lore no disponible');
    }
  }, []);

  useEffect(() => {
    void refreshLibrary();
    void refreshInventory();
  }, [refreshLibrary, refreshInventory]);

  useEffect(() => {
    if (!loading) {
      setLoadingSec(0);
      return;
    }
    const t = setInterval(() => setLoadingSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const selectChapter = async (season: WorldEngineLibrarySeason, ch: WorldEngineLibraryChapter) => {
    setSelectedChapterId(ch.id);
    setSelectedMeta({
      seasonSlug: season.slug,
      chapterNumber: ch.chapter_number,
      title: ch.title,
      seasonNumber: season.sort_order ?? 1,
    });
    setError(null);
    const lsKey = storageKeyForChapter(season.slug, ch.chapter_number);
    const saved = loadDirectorBundle(lsKey);
    if (saved) {
      setDirectorBundle(saved);
      setNovelText(saved.workspaceSnapshot || saved.novel);
    } else {
      setDirectorBundle(null);
    }
    try {
      const bundle = await getWorldEngineChapter(ch.id);
      const prose =
        bundle.novel && typeof bundle.novel === 'object' && 'prose' in bundle.novel
          ? String((bundle.novel as { prose?: string }).prose ?? '')
          : '';
      if (prose.trim()) {
        setNovelText(prose);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el capítulo');
    }
  };

  const newLocalDraft = () => {
    setSelectedChapterId(null);
    setSelectedMeta(null);
    setPersistNextRun(false);
    const saved = loadDirectorBundle(LOCAL_DRAFT_KEY);
    if (saved) {
      setDirectorBundle(saved);
      setNovelText(saved.workspaceSnapshot || saved.novel);
    } else {
      setDirectorBundle(null);
      setNovelText('');
    }
  };

  const beatPayload = useMemo(
    () => buildBeatPayload(novelText, aiDirective),
    [novelText, aiDirective],
  );

  /** Iframe `/manga/embed`: recibe paneles + guion vía postMessage tras el pipeline. */
  const bookPanelsIframeRef = useRef<HTMLIFrameElement>(null);

  const postPanelsToBookIframe = useCallback(
    (data: { panels?: MangaPanel[]; script?: string | null | undefined }) => {
      const chapterLabel = selectedMeta?.title?.trim()
        ? `Chapter ${selectedMeta.chapterNumber} — ${selectedMeta.title}`
        : selectedMeta
          ? `Chapter ${selectedMeta.chapterNumber} — Bond Converge`
          : 'Chapter I — Bond Converge';

      const msg = {
        type: MANGA_PANELS_POST_TYPE,
        panels: data.panels ?? [],
        script: data.script ?? '',
        chapterLabel,
      };

      const send = () => {
        bookPanelsIframeRef.current?.contentWindow?.postMessage(msg, '*');
      };
      queueMicrotask(send);
      window.setTimeout(send, 80);
    },
    [selectedMeta],
  );

  const runManga = async () => {
    const trimmed = beatPayload.trim();
    if (!trimmed) return;
    setLoading(true);
    setRunMode('manga');
    setError(null);
    setMangaResult(null);
    setWorldResult(null);
    try {
      const data = await postMangaPipeline([trimmed], {
        chapter_number: selectedMeta?.chapterNumber ?? 1,
        season_number: selectedMeta?.seasonNumber ?? 1,
        chapter_title: selectedMeta?.title ?? undefined,
        narrative_language: spellLang === 'auto' ? undefined : spellLang,
      });
      setMangaResult(data);
      setError(data.error ?? null);
      if (!data.error) {
        const b = bundleFromManga(data, trimmed, selectedMeta);
        setDirectorBundle(b);
        saveDirectorBundle(currentStorageKey(selectedMeta), b);
        lastSavedJson.current = JSON.stringify(b);
        setEditorTab('novel_final');
        postPanelsToBookIframe({ panels: data.panels, script: data.script });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
      setRunMode(null);
    }
  };

  const runWorldEngine = async () => {
    const trimmed = beatPayload.trim();
    if (!trimmed) return;
    setLoading(true);
    setRunMode('world');
    setError(null);
    setMangaResult(null);
    setWorldResult(null);
    try {
      const body: Parameters<typeof postWorldEnginePipeline>[0] = {
        beats: [trimmed],
      };
      if (persistNextRun && selectedMeta) {
        body.persist = true;
        body.season_slug = selectedMeta.seasonSlug;
        body.chapter_number = selectedMeta.chapterNumber;
        body.chapter_title = selectedMeta.title ?? undefined;
      }
      const data = await postWorldEnginePipeline(body);
      setWorldResult(data);
      setError(data.error ?? null);
      if (data.novel) setNovelText(data.novel);
      if (!data.error) {
        const b = bundleFromWorld(data, trimmed, selectedMeta);
        setDirectorBundle(b);
        saveDirectorBundle(currentStorageKey(selectedMeta), b);
        lastSavedJson.current = JSON.stringify(b);
        setEditorTab('novel_final');
        postPanelsToBookIframe({ panels: data.panels, script: data.script });
      }
      void refreshLibrary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'World Engine failed');
    } finally {
      setLoading(false);
      setRunMode(null);
    }
  };

  const displayPanels: MangaPanel[] =
    directorBundle && directorBundle.panels.length > 0
      ? directorBundle.panels
      : worldResult?.panels ?? mangaResult?.panels ?? [];
  const displayScript =
    directorBundle?.script ?? worldResult?.script ?? mangaResult?.script ?? '';
  const timings = worldResult?.timings_ms ?? mangaResult?.timings_ms;
  const imgErrs = worldResult?.image_errors ?? mangaResult?.image_errors ?? [];

  const vfxAnimeMotion =
    directorBundle?.animeMotion ?? mangaResult?.anime_motion ?? undefined;
  const vfxAnimationMeta = directorBundle?.animationMetadata ?? mangaResult?.animation_metadata;

  const historyKeyLabel = currentStorageKey(selectedMeta);

  useEffect(() => {
    if (!directorBundle) return;
    const key = currentStorageKey(selectedMeta);
    const t = setTimeout(() => {
      const payload: DirectorBundle = {
        ...directorBundle,
        savedAt: new Date().toISOString(),
        seasonSlug: selectedMeta?.seasonSlug ?? directorBundle.seasonSlug,
        chapterNumber: selectedMeta?.chapterNumber ?? directorBundle.chapterNumber,
      };
      saveDirectorBundle(key, payload);
      lastSavedJson.current = JSON.stringify(payload);
    }, 450);
    return () => clearTimeout(t);
  }, [directorBundle, selectedMeta]);

  const novelFinalText =
    directorBundle?.novel ?? mangaResult?.novel ?? worldResult?.novel ?? '';
  const scriptTabText = directorBundle?.script ?? displayScript;

  const applyNovelFinal = (next: string) => {
    if (directorBundle) setDirectorBundle({ ...directorBundle, novel: next });
    else if (mangaResult)
      setDirectorBundle({ ...bundleFromManga(mangaResult, beatPayload, selectedMeta), novel: next });
    else if (worldResult)
      setDirectorBundle({ ...bundleFromWorld(worldResult, beatPayload, selectedMeta), novel: next });
    else setNovelText(next);
  };

  const applyScriptTab = (next: string) => {
    if (directorBundle) setDirectorBundle({ ...directorBundle, script: next });
    else if (mangaResult)
      setDirectorBundle({ ...bundleFromManga(mangaResult, beatPayload, selectedMeta), script: next });
    else if (worldResult)
      setDirectorBundle({ ...bundleFromWorld(worldResult, beatPayload, selectedMeta), script: next });
  };

  const runSpellForActiveTab = () => {
    if (loading) return;
    if (editorTab === 'draft') void runSpellcheckOnBlur(novelText, setNovelText);
    else if (editorTab === 'novel_final') void runSpellcheckOnBlur(novelFinalText, applyNovelFinal);
    else void runSpellcheckOnBlur(scriptTabText, applyScriptTab);
  };

  return (
    <div className="manga-studio manga-studio--production-dashboard">
      <header className="manga-studio__header">
        <div>
          <p className="font-datum manga-studio__eyebrow">
            CONVERGEVERSE STUDIO // CONTROL TOTAL · DASHBOARD DE PRODUCCIÓN
          </p>
          <h1 className="manga-studio__title chapter-title" style={{ borderLeft: 'none', paddingLeft: 0 }}>
            Manga Studio
          </h1>
          <p className="font-datum manga-studio__lede">
            <strong>The Architect&apos;s Quill</strong> gobierna el flujo: beat → novela con reparto · corrector ES/EN/FR · 2
            paneles · VFX. Inventario (izq.) · editor (centro) · render (der.).
          </p>
          <Link href="/story-engine" className="font-datum manga-studio__back">
            ← Índice del estudio
          </Link>
        </div>
        <div className="manga-studio__header-actions font-datum">
          <button type="button" className="manga-studio__ghost-btn" onClick={() => void refreshLibrary()}>
            Actualizar biblioteca
          </button>
          <button type="button" className="manga-studio__ghost-btn" onClick={() => void refreshInventory()}>
            Refrescar inventario
          </button>
        </div>
      </header>

      <ArchitectsQuillPanel studioCast={inventory?.studio_cast} />

      <div className="manga-studio__desk manga-studio__desk--dashboard">
        {/* ——— Inventario + biblioteca ——— */}
        <aside
          className="manga-studio__rail manga-studio__rail--left manga-studio__rail--inventory surface"
          aria-label="Inventario y temporadas"
        >
          <div className="manga-studio__rail-head font-datum">
            <span className="manga-studio__rail-label">INV</span>
            <span className="manga-studio__rail-meta">Personajes · Ciudades · Capítulos</span>
          </div>
          <div className="manga-studio__rail-body manga-studio__inventory-scroll">
            <section className="prod-inv-section" aria-labelledby="inv-chars-heading">
              <h2 id="inv-chars-heading" className="prod-inv-heading font-datum">
                Personajes
              </h2>
              {inventoryError && (
                <p className="manga-studio__nav-hint font-datum" role="status">
                  {inventoryError}
                </p>
              )}
              {!inventory && !inventoryError && (
                <p className="manga-studio__nav-hint font-datum">Cargando inventario…</p>
              )}
              <ul className="prod-inv-list">
                {(inventory?.characters ?? []).map((c) => (
                  <li key={`${c.source}-${c.name}`} className="prod-inv-card font-datum">
                    <span className="prod-inv-card__name">{c.name}</span>
                    <span className="prod-inv-card__src">{c.source}</span>
                    {c.visual ? <p className="prod-inv-card__detail">{c.visual}</p> : null}
                    {c.traits ? <p className="prod-inv-card__detail prod-inv-card__detail--muted">{c.traits}</p> : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="prod-inv-section" aria-labelledby="inv-locs-heading">
              <h2 id="inv-locs-heading" className="prod-inv-heading font-datum">
                Ciudades / ubicaciones
              </h2>
              <ul className="prod-inv-list">
                {(inventory?.locations ?? []).map((loc) => (
                  <li key={`${loc.source}-${loc.name}`} className="prod-inv-card font-datum">
                    <span className="prod-inv-card__name">{loc.name}</span>
                    <span className="prod-inv-card__src">{loc.source}</span>
                    {loc.style ? <p className="prod-inv-card__detail">{loc.style}</p> : null}
                  </li>
                ))}
              </ul>
            </section>

            <div className="prod-inv-divider font-datum">Biblioteca SQLite</div>
            <button type="button" className="manga-studio__new-draft font-datum" onClick={newLocalDraft}>
              + Nuevo borrador local
            </button>
            {libraryError && (
              <p className="manga-studio__nav-hint font-datum" role="status">
                {libraryError}
              </p>
            )}
            {!library.length && !libraryError && (
              <p className="manga-studio__nav-hint font-datum">
                Sin capítulos en SQLite. Ejecuta World Engine con persist o ignora esta sección.
              </p>
            )}
            <ul className="manga-studio__season-list">
              {library.map((season) => (
                <li key={season.id} className="manga-studio__season">
                  <div className="manga-studio__season-title font-datum">
                    {season.title}
                    <span className="manga-studio__season-slug"> {season.slug}</span>
                  </div>
                  <ul className="manga-studio__chapter-list">
                    {season.chapters.map((ch) => (
                      <li key={ch.id}>
                        <button
                          type="button"
                          className={
                            selectedChapterId === ch.id
                              ? 'manga-studio__chapter manga-studio__chapter--active font-datum'
                              : 'manga-studio__chapter font-datum'
                          }
                          onClick={() => void selectChapter(season, ch)}
                        >
                          <span className="manga-studio__chapter-num">
                            T{season.sort_order ?? 1} · E{ch.chapter_number}
                          </span>
                          <span className="manga-studio__chapter-title">{ch.title || ch.slug}</span>
                          {ch.formats_saved?.length ? (
                            <span className="manga-studio__chapter-formats">{ch.formats_saved.join(' · ')}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ——— Editor central con pestañas ——— */}
        <main className="manga-studio__center manga-studio__center--dashboard surface" aria-label="Editor de producción">
          <div className="manga-studio__rail-head font-datum">
            <span className="manga-studio__rail-label">EDITOR</span>
            <span className="manga-studio__rail-meta">
              Historial: {historyKeyLabel}
              {selectedMeta
                ? ` · ${selectedMeta.seasonSlug} cap.${selectedMeta.chapterNumber}`
                : ' · borrador local'}
            </span>
          </div>

          <div className="prod-editor-tabs font-datum" role="tablist" aria-label="Fases de texto">
            {(
              [
                { id: 'draft' as const, label: 'BORRADOR' },
                { id: 'novel_final' as const, label: 'NOVELA FINAL' },
                { id: 'manga_script' as const, label: 'GUION MANGA' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={editorTab === tab.id}
                className={
                  editorTab === tab.id ? 'prod-editor-tabs__tab prod-editor-tabs__tab--active' : 'prod-editor-tabs__tab'
                }
                onClick={() => setEditorTab(tab.id)}
              >
                [{tab.label}]
              </button>
            ))}
          </div>

          <div className="manga-studio__center-body manga-studio__center-body--tabs">
            {editorTab === 'draft' && (
              <>
                <label htmlFor="manga-studio-draft" className="sr-only">
                  Borrador / beats
                </label>
                <textarea
                  id="manga-studio-draft"
                  className="manga-studio__novel-input manga-studio__novel-input--tabbed font-datum"
                  value={novelText}
                  onChange={(e) => {
                    setNovelText(e.target.value);
                    if (spellStatus.state !== 'idle') clearSpellStatus();
                  }}
                  onBlur={() => {
                    if (loading) return;
                    void runSpellcheckOnBlur(novelText, setNovelText);
                  }}
                  placeholder="Beat del Arquitecto (1–3 frases). Ej.: Paula sana a Aren tras caer persiguiendo una mariposa; Luis suspira; Yaritza repara el bosque…"
                  spellCheck={false}
                />
              </>
            )}

            {editorTab === 'novel_final' && (
              <>
                <label htmlFor="manga-studio-novel-final" className="sr-only">
                  Novela final
                </label>
                <textarea
                  id="manga-studio-novel-final"
                  className="manga-studio__novel-input manga-studio__novel-input--tabbed font-datum"
                  value={novelFinalText}
                  onChange={(e) => {
                    applyNovelFinal(e.target.value);
                    if (spellStatus.state !== 'idle') clearSpellStatus();
                  }}
                  onBlur={() => {
                    if (loading) return;
                    void runSpellcheckOnBlur(novelFinalText, applyNovelFinal);
                  }}
                  placeholder="Novela generada o editada manualmente. Ejecutá el pipeline para rellenar."
                  spellCheck={false}
                />
                {directorBundle?.spellcheck && (
                  <p className="font-datum directors-cut-panel__spell">
                    Última API: [{directorBundle.spellcheck.language}]{' '}
                    {directorBundle.spellcheck.replacements} reemplazo(s)
                  </p>
                )}
                <LegacyBook
                  novelText={novelFinalText}
                  onNovelTextChange={applyNovelFinal}
                  chapterNumber={selectedMeta?.chapterNumber ?? 1}
                  seasonFolder="season_1"
                  chapterTitle={selectedMeta?.title}
                  spellLang={spellLang}
                />
              </>
            )}

            {editorTab === 'manga_script' && (
              <>
                <label htmlFor="manga-studio-script" className="sr-only">
                  Guion manga
                </label>
                <textarea
                  id="manga-studio-script"
                  className="manga-studio__novel-input manga-studio__novel-input--tabbed font-datum"
                  value={scriptTabText}
                  onChange={(e) => {
                    applyScriptTab(e.target.value);
                    if (spellStatus.state !== 'idle') clearSpellStatus();
                  }}
                  onBlur={() => {
                    if (loading) return;
                    void runSpellcheckOnBlur(scriptTabText, applyScriptTab);
                  }}
                  placeholder="Guion / narración del manga (editable tras el pipeline)."
                  spellCheck={false}
                />
              </>
            )}

            <SpellcheckHints status={spellStatus} />

            <div className="manga-studio__actions font-datum">
              <button
                type="button"
                className="manga-studio__btn manga-studio__btn--primary"
                disabled={loading || !beatPayload.trim()}
                onClick={() => void runManga()}
              >
                {loading && runMode === 'manga' ? `Generando… ${loadingSec}s` : 'Generar manga (rápido)'}
              </button>
              <button
                type="button"
                className="manga-studio__btn"
                disabled={loading || !beatPayload.trim()}
                onClick={() => void runWorldEngine()}
              >
                {loading && runMode === 'world' ? `World Engine… ${loadingSec}s` : 'World Engine (novela→manga→VFX)'}
              </button>
              <button type="button" className="manga-studio__btn manga-studio__btn--ghost" onClick={runSpellForActiveTab}>
                Corregir pestaña ahora
              </button>
            </div>
            {selectedMeta && (
              <label className="manga-studio__persist font-datum">
                <input
                  type="checkbox"
                  checked={persistNextRun}
                  onChange={(e) => setPersistNextRun(e.target.checked)}
                />
                Guardar salida en este capítulo (SQLite)
              </label>
            )}
            <TelemetryBar
              panelCount={displayPanels.length}
              scriptLength={displayScript ? displayScript.length : null}
              loading={loading}
              beatsProcessed={mangaResult?.beats_processed ?? worldResult?.beats_processed}
            />
          </div>
        </main>

        {/* ——— Paneles + VFX ——— */}
        <aside
          className="manga-studio__rail manga-studio__rail--right manga-studio__rail--panels surface"
          aria-label="Paneles y VFX"
        >
          <div className="manga-studio__rail-head font-datum">
            <span className="manga-studio__rail-label">RENDER</span>
            <span className="manga-studio__rail-meta">Paneles · VFX anime · IA</span>
          </div>
          <div className="manga-studio__rail-body manga-studio__panels-stack">
            <div className="prod-panels-viewer">
              {displayPanels.length === 0 ? (
                <p className="font-datum directors-cut-panel__empty prod-panels-empty">
                  Sin paneles. Generá con Manga o World Engine.
                </p>
              ) : (
                <MangaReader panels={displayPanels} chapterLabel="BOND_CONVERGE" />
              )}
            </div>

            <section className="prod-book-iframe-section font-datum" aria-label="Vista libro iframe">
              <h2 className="prod-vfx-heading" style={{ marginTop: '0.5rem' }}>
                Libro · flip (iframe)
              </h2>
              <p className="manga-studio__nav-hint" style={{ marginBottom: '0.5rem' }}>
                Tras Generar manga / World Engine, los paneles y el guion se envían aquí vía{' '}
                <code style={{ fontSize: '0.65em' }}>postMessage</code>.
              </p>
              <iframe
                ref={bookPanelsIframeRef}
                title="Libro manga — vista embebida"
                src="/manga/embed"
                className="prod-book-iframe"
                sandbox="allow-scripts allow-same-origin"
                style={{
                  width: '100%',
                  minHeight: 420,
                  border: '2px solid var(--border)',
                  borderRadius: 4,
                  background: '#0a0a10',
                }}
              />
            </section>

            <section className="prod-vfx-section font-datum" aria-labelledby="vfx-anime-heading">
              <h2 id="vfx-anime-heading" className="prod-vfx-heading">
                Configuración VFX — Anime
              </h2>

              {vfxAnimationMeta?.scenes && vfxAnimationMeta.scenes.length > 0 ? (
                <ul className="manga-studio__vfx-list">
                  {vfxAnimationMeta.scenes.map((sc, i) => (
                    <li key={i} className="manga-studio__vfx-item">
                      <strong>Escena {(sc.panel_index ?? i) + 1}</strong>
                      <p>
                        <span className="manga-studio__vfx-type">Director</span> {sc.director_instruction}
                      </p>
                      <p>
                        <span className="manga-studio__vfx-type">Partículas</span> {sc.particles_blue_light}
                      </p>
                      {sc.timing_beat ? (
                        <p className="manga-studio__vfx-meta">Timing: {sc.timing_beat}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {vfxAnimeMotion && vfxAnimeMotion.length > 0 ? (
                <ul className="manga-studio__vfx-list">
                  {vfxAnimeMotion.map((row, i) => (
                    <li key={`tech-${i}`} className="manga-studio__vfx-item">
                      <strong>Panel {i + 1} — técnico</strong>
                      <p>
                        <span className="manga-studio__vfx-type">Camera_Movement</span> {row.Camera_Movement}
                      </p>
                      <p>
                        <span className="manga-studio__vfx-type">VFX_Blue_Sparks</span> {row.VFX_Blue_Sparks}
                      </p>
                      <p>
                        <span className="manga-studio__vfx-type">SFX</span> {row.SFX_Konosuba_Funny_Sound}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : directorBundle?.worldVfx && directorBundle.worldVfx.length > 0 ? (
                <ul className="manga-studio__vfx-list">
                  {directorBundle.worldVfx.map((v, i) => (
                    <li key={i} className="manga-studio__vfx-item">
                      <strong>{v.title || `Shot ${v.shot_index ?? i}`}</strong>
                      {v.vfx_type ? <span className="manga-studio__vfx-type"> [{v.vfx_type}]</span> : null}
                      {v.description ? <p>{v.description}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : worldResult?.anime_vfx && worldResult.anime_vfx.length > 0 ? (
                <ul className="manga-studio__vfx-list">
                  {worldResult.anime_vfx.map((v, i) => (
                    <li key={i} className="manga-studio__vfx-item">
                      <strong>{v.title || `Shot ${v.shot_index ?? i}`}</strong>
                      {v.description ? <p>{v.description}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="directors-cut-panel__empty">
                  Sin motion/VFX aún. El pipeline maestro rellena metadatos de director + JSON técnico.
                </p>
              )}

              {vfxAnimationMeta?.overall_notes ? (
                <p className="prod-vfx-notes font-datum">Notas: {vfxAnimationMeta.overall_notes}</p>
              ) : null}
            </section>

            <section className="prod-ai-strip font-datum" aria-label="Directivas IA">
              <p className="manga-studio__ai-help">Directivas de producción (se envían con el borrador)</p>
              <div className="manga-studio__chips">
                {AI_QUICK_ACTIONS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className="manga-studio__chip font-datum"
                    onClick={() =>
                      setAiDirective((prev) => (prev.trim() ? `${prev.trim()}\n\n${chip.text}` : chip.text))
                    }
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <label htmlFor="manga-studio-ai" className="manga-studio__ai-label font-datum">
                Instrucción libre
              </label>
              <textarea
                id="manga-studio-ai"
                className="manga-studio__ai-input font-datum"
                value={aiDirective}
                onChange={(e) => setAiDirective(e.target.value)}
                placeholder='Ej.: "Más chistoso" o "Cambiar look de Aren"'
                rows={5}
              />
            </section>
          </div>
        </aside>
      </div>

      {error && (
        <div className="bvl-alert font-datum manga-studio__alert" role="alert">
          <strong>ERROR</strong> — {error}
        </div>
      )}

      {mangaResult?.architects_quill && (
        <p className="architects-quill__run-badge font-datum" role="status">
          ARCHITECT&apos;S QUILL · flujo {mangaResult.production_flow ?? 'architects_quill'} — reparto familiar en novela,
          2 paneles y metadatos VFX
        </p>
      )}

      {timings && (
        <div className="font-datum pipeline-timings manga-studio__timings">
          <span className="pipeline-timings__label">ÚLTIMA CORRIDA</span>
          {'narrative_three_step' in timings && timings.narrative_three_step != null && (
            <>
              <span>narrativa {timings.narrative_three_step} ms</span>
              <span>·</span>
            </>
          )}
          {timings.novel_llm != null && (
            <>
              <span>novela LLM {timings.novel_llm} ms</span>
              <span>·</span>
            </>
          )}
          {timings.manga_moments_llm != null && (
            <>
              <span>manga momentos {timings.manga_moments_llm} ms</span>
              <span>·</span>
            </>
          )}
          {timings.anime_motion_llm != null && (
            <>
              <span>anime motion {timings.anime_motion_llm} ms</span>
              <span>·</span>
            </>
          )}
          {timings.animation_metadata_llm != null && (
            <>
              <span>anim meta {timings.animation_metadata_llm} ms</span>
              <span>·</span>
            </>
          )}
          {timings.script != null && (
            <>
              <span>guion {timings.script} ms</span>
              <span>·</span>
            </>
          )}
          {timings.images != null && <span>imágenes {timings.images} ms</span>}
          {timings.images != null && <span>·</span>}
          <span>total {((timings.total ?? 0) / 1000).toFixed(1)} s</span>
        </div>
      )}

      {imgErrs.length > 0 && (
        <div className="bvl-alert font-datum" role="status">
          <strong>IMAGEN</strong> — {imgErrs.length} panel(es).{' '}
          {imgErrs.map((e, i) => (
            <span key={i}>
              [panel {e.scene_index ?? '?'}] {e.error}
              {i < imgErrs.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </div>
      )}

      {(mangaResult?.persisted_path ||
        mangaResult?.production_dir ||
        directorBundle?.persistedPath ||
        directorBundle?.productionDir) && (
        <p className="font-datum manga-studio__persist-note">
          API:{' '}
          {mangaResult?.production_dir ??
            directorBundle?.productionDir ??
            mangaResult?.persisted_path ??
            directorBundle?.persistedPath}
        </p>
      )}

      <footer className="manga-studio__footer-total font-datum" role="contentinfo">
        <div className="manga-studio__footer-lang" aria-label="Corrector ortográfico">
          <span className="manga-studio__footer-lang-label">Idioma corrector</span>
          <div className="manga-studio__lang-toggle" role="group">
            {SPELL_LANGS.map((L) => (
              <button
                key={L.id}
                type="button"
                className={
                  spellLang === L.id ? 'manga-studio__lang-btn manga-studio__lang-btn--active' : 'manga-studio__lang-btn'
                }
                onClick={() => setSpellLang(L.id)}
                aria-pressed={spellLang === L.id}
              >
                {L.label}
              </button>
            ))}
          </div>
          <span
            className={
              spellStatus.state === 'checking'
                ? 'manga-studio__spell-pill manga-studio__spell-pill--active'
                : spellStatus.state === 'ok'
                  ? 'manga-studio__spell-pill manga-studio__spell-pill--ok'
                  : spellStatus.state === 'error'
                    ? 'manga-studio__spell-pill manga-studio__spell-pill--err'
                    : 'manga-studio__spell-pill'
            }
          >
            {spellStatus.state === 'idle' && 'Corrector listo (salir del campo o botón “Corregir”)'}
            {spellStatus.state === 'checking' && 'Corrigiendo…'}
            {spellStatus.state === 'ok' &&
              `Activo · ${spellStatus.lang.toUpperCase()} · ${spellStatus.replacementCount} auto-fix`}
            {spellStatus.state === 'error' && `Error: ${spellStatus.message}`}
          </span>
        </div>
        <div className="manga-studio__footer-agents">
          <span>SCRIPT_AGENT</span>
          <span className={loading ? 'manga-studio__pulse' : ''}>{loading ? 'RUN' : 'IDLE'}</span>
          <span>·</span>
          <span>IMAGE_AGENT</span>
          <span className={loading ? 'manga-studio__pulse' : ''}>{loading ? 'RUN' : 'IDLE'}</span>
          <span>·</span>
          <span>WORLD_ENGINE</span>
          <span className={loading && runMode === 'world' ? 'manga-studio__pulse' : ''}>
            {loading && runMode === 'world' ? 'RUN' : 'IDLE'}
          </span>
        </div>
      </footer>
    </div>
  );
}
