'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReaderSettings } from '@/hooks/useReaderSettings';
import {
  extractBondGlossarySegments,
  parseDoubleLayerScript,
  stripDoubleLayerMarkers,
  type DoubleLayerSegment,
} from '@/lib/parseDoubleLayerDialogue';

export type ReadingExperienceProps = {
  /** Texto mostrado (guion actual, p. ej. borrador en vivo) */
  content: string;
  title?: string;
  chapterId?: string;
  /** URLs MP3 (OpenAI TTS en Storage); varias = playlist en orden */
  narrationUrls?: string[] | null;
  /** Primera URL rápida (columna Supabase) */
  narrationAudioUrl?: string | null;
  /** Tras POST /chapters/narrate, el padre fusiona el capítulo actualizado */
  onChapterUpdated?: (patch: Record<string, unknown>) => void;
  /** POST narrate usando la misma base que Story Engine */
  postNarrate?: (chapterId: string) => Promise<Record<string, unknown>>;
  /**
   * Guardar tamaño de letra y preferencia de narración en Supabase (`user_reader_settings`)
   * vía FastAPI. Si false, solo `localStorage` en este perfil.
   */
  persistReaderSettings?: boolean;
  /** Perfil lógico (misma máquina: `default` o `NEXT_PUBLIC_READER_PROFILE_ID`). */
  readerProfileId?: string;
  /**
   * «Vuelo de imaginación» — interferencia tipo multiverso cuando el capítulo nace de una
   * línea temporal regenerada (BOND OS / paradoja).
   */
  timelineGlitch?: boolean;
};

const glassOuter: React.CSSProperties = {
  padding: '1.75rem',
  background: 'rgba(0, 0, 0, 0.78)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '1.5rem',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#f5f5f5',
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
};

const controlBar: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.65rem',
  marginBottom: '1.25rem',
  padding: '0.65rem 1rem',
  borderRadius: '9999px',
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

const pillBtn: React.CSSProperties = {
  padding: '0.35rem 0.65rem',
  borderRadius: '9999px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#e8e8e8',
  fontSize: '0.8rem',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
};

const primaryBtn: React.CSSProperties = {
  ...pillBtn,
  background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
  border: '1px solid rgba(96, 165, 250, 0.5)',
  fontWeight: 700,
  padding: '0.45rem 1.1rem',
};

function DoubleLayerBlock({
  segment,
  fontSize,
}: {
  segment: DoubleLayerSegment;
  fontSize: number;
}) {
  if (segment.type === 'plain') {
    return (
      <div
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: `${fontSize}px`,
          lineHeight: 1.8,
          fontWeight: 300,
        }}
      >
        {segment.text}
      </div>
    );
  }

  if (segment.type === 'bond_os') {
    return (
      <div
        style={{
          borderLeft: '4px solid rgba(56, 189, 248, 0.85)',
          paddingLeft: '1rem',
          paddingTop: '0.65rem',
          paddingBottom: '0.65rem',
          borderRadius: '0 12px 12px 0',
          background:
            'linear-gradient(90deg, rgba(12, 74, 110, 0.38) 0%, rgba(15, 23, 42, 0.22) 100%)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: `${Math.max(13, fontSize - 1)}px`,
          lineHeight: 1.65,
          letterSpacing: '0.02em',
          color: 'rgba(186, 230, 253, 0.96)',
          whiteSpace: 'pre-wrap',
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: '0.55em',
            letterSpacing: '0.2em',
            color: 'rgba(125, 211, 252, 0.8)',
            marginBottom: '0.5rem',
          }}
        >
          BOND OS · NARRADOR TÉCNICO
        </span>
        <div>{segment.text}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderLeft: '4px solid rgba(251, 146, 60, 0.92)',
        paddingLeft: '1rem',
        paddingTop: '0.55rem',
        paddingBottom: '0.55rem',
        borderRadius: '0 12px 12px 0',
        background: 'linear-gradient(90deg, rgba(124, 45, 18, 0.28) 0%, rgba(30, 27, 20, 0.38) 100%)',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: `${fontSize}px`,
        lineHeight: 1.75,
        fontStyle: 'italic',
        fontWeight: 500,
        color: 'rgba(254, 243, 199, 0.98)',
        whiteSpace: 'pre-wrap',
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: '0.58em',
          letterSpacing: '0.16em',
          fontStyle: 'normal',
          color: 'rgba(253, 186, 116, 0.92)',
          marginBottom: '0.4rem',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        AREN · INTERRUPCIÓN
      </span>
      <div>{segment.text}</div>
    </div>
  );
}

export function ReadingExperience({
  content,
  title,
  chapterId,
  narrationUrls,
  narrationAudioUrl,
  onChapterUpdated,
  postNarrate,
  persistReaderSettings = true,
  readerProfileId,
  timelineGlitch = false,
}: ReadingExperienceProps) {
  const {
    settings: { fontSize, narrationEnabled },
    setFontSize,
    setNarrationEnabled,
    remoteOk,
  } = useReaderSettings(persistReaderSettings, readerProfileId);

  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [isBrowserSpeaking, setIsBrowserSpeaking] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urls = useMemo(() => {
    if (narrationUrls?.length) return narrationUrls.filter(Boolean);
    if (narrationAudioUrl) return [narrationAudioUrl];
    return [];
  }, [narrationUrls, narrationAudioUrl]);

  const dialogueLayers = useMemo(() => parseDoubleLayerScript(content), [content]);

  const bondGlossaryBlocks = useMemo(
    () => extractBondGlossarySegments(dialogueLayers),
    [dialogueLayers],
  );

  const simplePlainOnly =
    dialogueLayers.length === 1 && dialogueLayers[0]?.type === 'plain';

  const [actionFocusMode, setActionFocusMode] = useState(false);
  const [nerdPanelOpen, setNerdPanelOpen] = useState(false);

  useEffect(() => {
    setActionFocusMode(bondGlossaryBlocks.length > 0);
  }, [bondGlossaryBlocks.length]);

  const mainSegments = useMemo(() => {
    if (simplePlainOnly) return dialogueLayers;
    if (actionFocusMode && bondGlossaryBlocks.length > 0) {
      return dialogueLayers.filter((s) => s.type !== 'bond_os');
    }
    return dialogueLayers;
  }, [
    dialogueLayers,
    actionFocusMode,
    bondGlossaryBlocks.length,
    simplePlainOnly,
  ]);

  const ttsPlainText = useMemo(() => stripDoubleLayerMarkers(content), [content]);

  const stopBrowserVoice = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsBrowserSpeaking(false);
  }, []);

  const stopAllAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = '';
    }
    setIsPlayingTts(false);
    setSegmentIndex(0);
    stopBrowserVoice();
  }, [stopBrowserVoice]);

  useEffect(() => {
    return () => stopAllAudio();
  }, [stopAllAudio]);

  useEffect(() => {
    if (!nerdPanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNerdPanelOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nerdPanelOpen]);

  const playSegment = useCallback(
    (index: number) => {
      if (!urls.length) return;
      const url = urls[index];
      if (!url) return;
      let a = audioRef.current;
      if (!a) {
        a = new Audio();
        audioRef.current = a;
      }
      a.src = url;
      a.onended = () => {
        if (index + 1 < urls.length) {
          setSegmentIndex(index + 1);
          playSegment(index + 1);
        } else {
          setIsPlayingTts(false);
          setSegmentIndex(0);
        }
      };
      a.onerror = () => {
        setIsPlayingTts(false);
        setTtsError('No se pudo reproducir el audio (URL o CORS).');
      };
      void a.play().catch(() => {
        setIsPlayingTts(false);
        setTtsError('Reproducción bloqueada o URL inválida.');
      });
    },
    [urls],
  );

  const toggleTtsPlayback = () => {
    if (!narrationEnabled) {
      setTtsError('Activa «Narración» en el panel para usar audio TTS.');
      return;
    }
    setTtsError(null);
    stopBrowserVoice();
    if (!urls.length) {
      setTtsError('No hay narración generada. Usa «Generar voz (API)» o publica con TTS.');
      return;
    }
    const a = audioRef.current;
    if (a?.src && !a.paused) {
      a.pause();
      setIsPlayingTts(false);
      return;
    }
    if (a?.src && a.paused) {
      setIsPlayingTts(true);
      void a.play().catch(() => {
        setIsPlayingTts(false);
        setTtsError('No se pudo reanudar el audio.');
      });
      return;
    }
    setIsPlayingTts(true);
    setSegmentIndex(0);
    playSegment(0);
  };

  const toggleBrowserNarration = () => {
    if (!narrationEnabled) {
      setTtsError('Activa «Narración» en el panel para usar la voz del navegador.');
      return;
    }
    setTtsError(null);
    const a = audioRef.current;
    if (a) {
      a.pause();
      setIsPlayingTts(false);
    }
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setTtsError('Tu navegador no soporta lectura por voz.');
      return;
    }
    if (isBrowserSpeaking) {
      window.speechSynthesis.cancel();
      setIsBrowserSpeaking(false);
      return;
    }
    if (!ttsPlainText.trim()) {
      setTtsError('No hay texto para leer.');
      return;
    }
    const u = new SpeechSynthesisUtterance(ttsPlainText);
    u.lang = 'es-MX';
    u.rate = 0.95;
    u.onend = () => setIsBrowserSpeaking(false);
    u.onerror = () => setIsBrowserSpeaking(false);
    setIsBrowserSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const handleGenerateApiNarration = async () => {
    if (!narrationEnabled) {
      setTtsError('Activa «Narración» para generar voz por API.');
      return;
    }
    if (!chapterId || !postNarrate) {
      setTtsError('Generación por API no disponible (falta chapterId o callback).');
      return;
    }
    setTtsError(null);
    setTtsLoading(true);
    try {
      const data = await postNarrate(chapterId);
      const ch = data.chapter as Record<string, unknown> | undefined;
      if (ch && onChapterUpdated) {
        onChapterUpdated(ch);
      }
    } catch (e) {
      setTtsError(e instanceof Error ? e.message : 'Error al generar narración');
    } finally {
      setTtsLoading(false);
    }
  };

  const isReading = isPlayingTts || isBrowserSpeaking;

  return (
    <div style={{ position: 'relative', borderRadius: '1.5rem' }}>
      {timelineGlitch ? (
        <>
          <style
            dangerouslySetInnerHTML={{
              __html: `
              @keyframes cvGlitchJitter {
                0%, 100% { transform: translate(0,0); opacity: 0.92; }
                20% { transform: translate(-1px, 1px); opacity: 0.85; }
                40% { transform: translate(1px, -1px); opacity: 0.95; }
                60% { transform: translate(-2px, 0); opacity: 0.78; }
                80% { transform: translate(1px, 1px); opacity: 0.9; }
              }
              @keyframes cvGlitchScan {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(100%); }
              }
            `,
            }}
          />
          <div
            aria-hidden
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              inset: 0,
              borderRadius: '1.5rem',
              zIndex: 2,
              overflow: 'hidden',
              animation: 'cvGlitchJitter 2.8s ease-in-out infinite',
              boxShadow: 'inset 0 0 0 1px rgba(236, 72, 153, 0.25), inset 0 0 40px rgba(59, 130, 246, 0.08)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '28%',
                background:
                  'linear-gradient(180deg, transparent, rgba(56, 189, 248, 0.07), rgba(236, 72, 153, 0.06), transparent)',
                animation: 'cvGlitchScan 3.5s linear infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 3px)',
                mixBlendMode: 'overlay',
                opacity: 0.5,
              }}
            />
          </div>
        </>
      ) : null}
      <div style={{ ...glassOuter, position: 'relative', zIndex: 1 }}>
      <div
        style={{
          fontSize: '0.62rem',
          letterSpacing: '0.2em',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: '0.75rem',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        LECTURA · MULTIVERSO
        {timelineGlitch && (
          <span
            style={{
              marginLeft: '0.65rem',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(236, 72, 153, 0.2)',
              border: '1px solid rgba(236, 72, 153, 0.35)',
              color: '#fda4af',
              letterSpacing: '0.14em',
            }}
          >
            RAMA ALTERNATIVA
          </span>
        )}
        {title ? (
          <span style={{ color: 'rgba(200, 220, 255, 0.7)', marginLeft: '0.75rem', letterSpacing: '0.08em' }}>
            {title}
          </span>
        ) : null}
        {dialogueLayers.length > 1 || (dialogueLayers[0] && dialogueLayers[0].type !== 'plain') ? (
          <span
            style={{
              marginLeft: '0.65rem',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              color: '#7dd3fc',
              letterSpacing: '0.12em',
              fontSize: '0.55rem',
            }}
            title="Guion con :::bond_os / :::aren — ver docs/DIGITAL_BOOK_DOUBLE_LAYER.md"
          >
            DOBLE CAPA
          </span>
        ) : null}
        {bondGlossaryBlocks.length > 0 ? (
          <span
            style={{
              marginLeft: '0.45rem',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(129, 140, 248, 0.14)',
              border: '1px solid rgba(129, 140, 248, 0.35)',
              color: '#c4b5fd',
              letterSpacing: '0.14em',
              fontSize: '0.52rem',
            }}
            title="Glosario Nerd disponible — botón ◈ BOND"
          >
            NERD
          </span>
        ) : null}
      </div>

      {persistReaderSettings ? (
        <div
          style={{
            fontSize: '0.58rem',
            color: remoteOk ? 'rgba(110, 200, 150, 0.85)' : 'rgba(255,255,255,0.38)',
            marginBottom: '0.65rem',
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '0.06em',
          }}
        >
          {remoteOk
            ? '◆ Ajustes guardados en Supabase (user_reader_settings)'
            : '◇ Sin sync remoto — usando localStorage o ejecuta docs/supabase_user_reader_settings.sql'}
        </div>
      ) : (
        <div
          style={{
            fontSize: '0.58rem',
            color: 'rgba(255,255,255,0.35)',
            marginBottom: '0.65rem',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          Ajustes solo en este navegador (localStorage)
        </div>
      )}

      <div style={controlBar}>
        <span
          style={{
            fontSize: '0.62rem',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            whiteSpace: 'nowrap',
          }}
        >
          Tamaño
        </span>
        <button
          type="button"
          style={pillBtn}
          onClick={() => setFontSize(fontSize - 2)}
          aria-label="Reducir tamaño de letra"
        >
          A−
        </button>
        <span
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.75rem',
            color: '#93c5fd',
            background: 'rgba(59, 130, 246, 0.2)',
            padding: '0.2rem 0.5rem',
            borderRadius: '8px',
            minWidth: '2.5rem',
            textAlign: 'center',
          }}
        >
          {fontSize}px
        </span>
        <input
          type="range"
          min={14}
          max={32}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          style={{ flex: '1 1 140px', minWidth: '100px', accentColor: '#3b82f6' }}
          aria-label="Tamaño de letra"
        />
        <button
          type="button"
          style={pillBtn}
          onClick={() => setFontSize(fontSize + 2)}
          aria-label="Aumentar tamaño de letra"
        >
          A+
        </button>
        <div
          style={{
            width: '1px',
            height: '1.35rem',
            background: 'rgba(255,255,255,0.2)',
            margin: '0 0.15rem',
          }}
        />
        {bondGlossaryBlocks.length > 0 ? (
          <>
            <span
              style={{
                fontSize: '0.58rem',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              Libro
            </span>
            <button
              type="button"
              style={{
                ...pillBtn,
                fontWeight: 700,
                borderColor: actionFocusMode ? 'rgba(251, 146, 60, 0.55)' : 'rgba(255,255,255,0.2)',
                background: actionFocusMode
                  ? 'rgba(251, 146, 60, 0.18)'
                  : 'rgba(255,255,255,0.08)',
                color: actionFocusMode ? '#fed7aa' : '#e8e8e8',
              }}
              onClick={() => setActionFocusMode(true)}
              title="Solo narración + Aren — la jerga BOND va al panel lateral"
            >
              Acción
            </button>
            <button
              type="button"
              style={{
                ...pillBtn,
                fontWeight: 700,
                borderColor: !actionFocusMode ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255,255,255,0.2)',
                background: !actionFocusMode
                  ? 'rgba(56, 189, 248, 0.15)'
                  : 'rgba(255,255,255,0.08)',
                color: !actionFocusMode ? '#bae6fd' : '#e8e8e8',
              }}
              onClick={() => setActionFocusMode(false)}
              title="Ver doble capa completa en el cuerpo"
            >
              Completo
            </button>
            <button
              type="button"
              style={{
                ...primaryBtn,
                padding: '0.4rem 0.85rem',
                fontSize: '0.72rem',
              }}
              onClick={() => setNerdPanelOpen(true)}
              aria-label="Abrir glosario Nerd BOND OS"
              title="Glosario de emergencia — física y sistemas"
            >
              ◈ BOND
            </button>
            <div
              style={{
                width: '1px',
                height: '1.35rem',
                background: 'rgba(255,255,255,0.2)',
                margin: '0 0.15rem',
              }}
            />
          </>
        ) : null}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.68rem',
            color: narrationEnabled ? '#c4d4ff' : '#666',
            cursor: 'pointer',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <input
            type="checkbox"
            checked={narrationEnabled}
            onChange={(e) => setNarrationEnabled(e.target.checked)}
          />
          Narración
        </label>
        <div
          style={{
            width: '1px',
            height: '1.35rem',
            background: 'rgba(255,255,255,0.2)',
            margin: '0 0.15rem',
          }}
        />

        <button
          type="button"
          style={{
            ...primaryBtn,
            opacity: narrationEnabled && urls.length ? 1 : 0.45,
          }}
          onClick={toggleTtsPlayback}
          disabled={!narrationEnabled || !urls.length}
          title={
            !narrationEnabled
              ? 'Activa narración en el panel'
              : urls.length
                ? 'Reproducir MP3 de OpenAI TTS (Storage)'
                : 'Genera narración en la API primero'
          }
        >
          {isPlayingTts ? '⏸ Pausar TTS' : '▶ Narrar (TTS)'}
        </button>

        <button
          type="button"
          style={{ ...pillBtn, opacity: narrationEnabled ? 1 : 0.45 }}
          onClick={toggleBrowserNarration}
          disabled={!narrationEnabled}
        >
          {isBrowserSpeaking ? '⏸ Pausar voz local' : '🔊 Voz del navegador'}
        </button>

        {chapterId && postNarrate ? (
          <button
            type="button"
            style={{
              ...pillBtn,
              borderColor: 'rgba(52, 211, 153, 0.35)',
              color: '#a7f3d0',
              opacity: narrationEnabled ? 1 : 0.45,
            }}
            onClick={() => void handleGenerateApiNarration()}
            disabled={ttsLoading || !narrationEnabled}
          >
            {ttsLoading ? '⏳ Generando…' : '⚡ Generar voz (API)'}
          </button>
        ) : null}

        {narrationEnabled && urls[0] ? (
          <audio
            controls
            src={urls[0]}
            style={{ height: 36, minWidth: 180, flex: '1 1 200px', accentColor: '#3b82f6' }}
            preload="metadata"
          />
        ) : null}
      </div>

      {urls.length > 1 && (
        <div
          style={{
            fontSize: '0.65rem',
            color: 'rgba(200,230,255,0.55)',
            marginBottom: '0.65rem',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          Audio en {urls.length} partes · reproduciendo segmento {Math.min(segmentIndex + 1, urls.length)} / {urls.length}
        </div>
      )}

      {ttsError && (
        <div
          style={{
            fontSize: '0.72rem',
            color: '#fca5a5',
            marginBottom: '0.75rem',
            padding: '0.5rem 0.65rem',
            borderRadius: '8px',
            background: 'rgba(127, 29, 29, 0.25)',
            border: '1px solid rgba(248, 113, 113, 0.35)',
          }}
        >
          {ttsError}
        </div>
      )}

      <article
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1.8,
          fontWeight: 300,
          fontFamily: 'Georgia, "Times New Roman", serif',
          transition: 'font-size 0.25s ease',
          maxHeight: 'min(60vh, 520px)',
          overflowY: 'auto',
          paddingRight: '0.75rem',
          textAlign: 'justify',
          color: 'rgba(229, 231, 235, 0.95)',
        }}
      >
        {simplePlainOnly ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{content || '—'}</div>
        ) : mainSegments.length === 0 && actionFocusMode && bondGlossaryBlocks.length > 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: '0.92em',
              lineHeight: 1.65,
              color: 'rgba(200, 220, 255, 0.82)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Este fragmento solo tiene capa <strong style={{ color: '#7dd3fc' }}>BOND OS</strong> (técnico).
            Pulsa <strong style={{ color: '#93c5fd' }}>◈ BOND</strong> para leer la física, o elige{' '}
            <strong>Completo</strong> para ver todo en línea.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mainSegments.map((seg, i) => (
              <DoubleLayerBlock key={`m-${i}-${seg.type}`} segment={seg} fontSize={fontSize} />
            ))}
          </div>
        )}
      </article>

      {isReading ? (
        <div
          style={{
            marginTop: '1rem',
            fontSize: '0.65rem',
            color: 'rgba(147, 197, 253, 0.85)',
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '0.06em',
          }}
        >
          {isPlayingTts ? '● Reproduciendo narración de alta fidelidad (OpenAI TTS)' : '● Leyendo con síntesis del navegador'}
        </div>
      ) : null}
    </div>

      {bondGlossaryBlocks.length > 0 ? (
        <>
          {nerdPanelOpen ? (
            <div
              role="presentation"
              aria-hidden="true"
              onClick={() => setNerdPanelOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 80,
                background: 'rgba(0,0,0,0.52)',
              }}
            />
          ) : null}
          <aside
            id="cv-nerd-glossary-panel"
            aria-hidden={!nerdPanelOpen}
            aria-labelledby="cv-nerd-glossary-title"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 'min(440px, 94vw)',
              height: '100%',
              maxHeight: '100dvh',
              zIndex: 90,
              background: 'linear-gradient(180deg, #0c1929 0%, #0a1628 45%, #0d1117 100%)',
              borderLeft: '1px solid rgba(56, 189, 248, 0.28)',
              boxShadow: '-16px 0 48px rgba(0,0,0,0.55)',
              transform: nerdPanelOpen ? 'translateX(0)' : 'translateX(105%)',
              transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.2rem 1rem 1.4rem',
              overflow: 'hidden',
              pointerEvents: nerdPanelOpen ? 'auto' : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.75rem',
                marginBottom: '1rem',
                flexShrink: 0,
              }}
            >
              <div>
                <h2
                  id="cv-nerd-glossary-title"
                  style={{
                    margin: 0,
                    fontSize: '0.72rem',
                    letterSpacing: '0.24em',
                    color: '#7dd3fc',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  GLOSARIO DE EMERGENCIA
                </h2>
                <p
                  style={{
                    margin: '0.4rem 0 0',
                    fontSize: '0.62rem',
                    lineHeight: 1.45,
                    color: 'rgba(186, 230, 253, 0.65)',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  BOND OS — física, sistemas y rigor. En el cuerpo usa <strong style={{ color: '#a5f3fc' }}>Acción</strong>{' '}
                  para leer solo narración + Aren.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNerdPanelOpen(false)}
                aria-label="Cerrar glosario Nerd"
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.35)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.1rem',
                paddingRight: '0.35rem',
              }}
            >
              {bondGlossaryBlocks.map((seg, idx) => (
                <div key={`gloss-${idx}`}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.52rem',
                      letterSpacing: '0.2em',
                      color: 'rgba(56, 189, 248, 0.75)',
                      marginBottom: '0.4rem',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    NOTA TÉCNICA {idx + 1} / {bondGlossaryBlocks.length}
                  </span>
                  <DoubleLayerBlock
                    segment={{ type: 'bond_os', text: seg.text }}
                    fontSize={Math.min(17, Math.max(14, fontSize - 1))}
                  />
                </div>
              ))}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
