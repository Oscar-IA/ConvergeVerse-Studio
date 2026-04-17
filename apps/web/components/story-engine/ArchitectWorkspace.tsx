'use client';

import type { CSSProperties } from 'react';

/**
 * Espacio de trabajo del Plot Architect — glassmorphism, estilo limpio tipo Apple.
 * La inyección usa la API del Story Engine (no Supabase directo en el cliente).
 */

export type ArchitectWorkspaceProps = {
  plotIdea: string;
  onPlotIdeaChange: (value: string) => void;
  onInjectPlot: () => void | Promise<void>;
  onGenerateEpisode: () => void | Promise<void>;
  injectDisabled?: boolean;
  generateDisabled?: boolean;
  injectLoading?: boolean;
  generateLoading?: boolean;
  pendingQueueCount?: number;
  queueLoading?: boolean;
  /** Ideas ya guardadas en servidor (pendientes de consumir al generar capítulos) */
  queuedNotes?: { id: string; raw_plot_idea: string; title?: string }[];
  /** Respaldo en este navegador si falló la red al guardar */
  localQueuedNotes?: { localId: string; raw_plot_idea: string; title?: string }[];
  onSyncLocalQueue?: () => void | Promise<void>;
  localSyncLoading?: boolean;
  /** Opciones de triangulación (compactas bajo la tarjeta) */
  skipTriangulation?: boolean;
  onSkipTriangulationChange?: (v: boolean) => void;
  consumeArchitectNotes?: boolean;
  onConsumeArchitectNotesChange?: (v: boolean) => void;
};

const fontStack =
  'system-ui, -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif';

export function ArchitectWorkspace({
  plotIdea,
  onPlotIdeaChange,
  onInjectPlot,
  onGenerateEpisode,
  injectDisabled = false,
  generateDisabled = false,
  injectLoading = false,
  generateLoading = false,
  pendingQueueCount = 0,
  queueLoading = false,
  queuedNotes = [],
  localQueuedNotes = [],
  onSyncLocalQueue,
  localSyncLoading = false,
  skipTriangulation = false,
  onSkipTriangulationChange,
  consumeArchitectNotes = true,
  onConsumeArchitectNotesChange,
}: ArchitectWorkspaceProps) {
  const glassCard: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '2.5rem',
    padding: 'clamp(1.5rem, 4vw, 2.25rem)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  };

  const btnGhost: CSSProperties = {
    fontFamily: fontStack,
    padding: '1rem 2rem',
    borderRadius: 9999,
    border: 'none',
    fontWeight: 700,
    fontSize: '0.8rem',
    letterSpacing: '0.02em',
    cursor: injectDisabled || injectLoading ? 'not-allowed' : 'pointer',
    opacity: injectDisabled || injectLoading ? 0.45 : 1,
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#f5f5f5',
    transition: 'background 0.2s ease, transform 0.15s ease',
  };

  const btnPrimary: CSSProperties = {
    fontFamily: fontStack,
    padding: '1rem 2rem',
    borderRadius: 9999,
    border: 'none',
    fontWeight: 700,
    fontSize: '0.8rem',
    letterSpacing: '0.04em',
    cursor: generateDisabled || generateLoading ? 'not-allowed' : 'pointer',
    opacity: generateDisabled || generateLoading ? 0.45 : 1,
    background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#fff',
    boxShadow: '0 12px 40px -8px rgba(37, 99, 235, 0.45)',
    transition: 'filter 0.2s ease, transform 0.15s ease',
  };

  return (
    <section
      style={{
        marginBottom: '2rem',
        fontFamily: fontStack,
        color: '#fafafa',
      }}
      aria-labelledby="architect-workspace-heading"
    >
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}
      >
        <h1
          id="architect-workspace-heading"
          style={{
            margin: 0,
            fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
            fontWeight: 700,
            letterSpacing: '-0.035em',
            color: '#7dd3fc',
          }}
        >
          Workspace · Plot Architect
        </h1>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
        }}
        >
          BOND OS
        </span>
      </div>

      <div style={glassCard}>
        <label
          htmlFor="architect-plot-textarea"
          style={{
            display: 'block',
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '0.5rem',
          }}
        >
          Inyección de trama (Story DNA)
        </label>
        <p
          style={{
            margin: '0 0 1rem',
            fontSize: '0.72rem',
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.32)',
          }}
        >
          Sin límite de caracteres en el editor: puedes escribir o pegar un capítulo completo. «Guardar idea» envía el texto íntegro a la cola (Supabase).
        </p>

        <textarea
          id="architect-plot-textarea"
          value={plotIdea}
          onChange={(e) => onPlotIdeaChange(e.target.value)}
          placeholder="Escribe el giro, el conflicto de Aren, la prueba rúnica o el gancho multiversal… (o pega aquí un capítulo entero)"
          rows={22}
          disabled={injectLoading || generateLoading}
          spellCheck
          style={{
            width: '100%',
            minHeight: 'min(70vh, 36rem)',
            boxSizing: 'border-box',
            background: 'transparent',
            border: 'none',
            resize: 'vertical',
            fontFamily: fontStack,
            fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
            lineHeight: 1.65,
            color: '#f0f0f0',
            outline: 'none',
          }}
        />

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
        >
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginRight: 'auto' }}>
            Cola servidor: {queueLoading ? '…' : pendingQueueCount} pendiente{pendingQueueCount === 1 ? '' : 's'}
            {localQueuedNotes.length > 0 && (
              <span style={{ color: 'rgba(251, 191, 36, 0.85)', marginLeft: '0.5rem' }}>
                · local: {localQueuedNotes.length} (sin sync)
              </span>
            )}
          </span>
          <button
            type="button"
            style={btnGhost}
            disabled={injectDisabled || injectLoading}
            onClick={() => void onInjectPlot()}
            onMouseEnter={(e) => {
              if (!injectDisabled && !injectLoading) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.16)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            {injectLoading ? 'Guardando…' : 'Guardar idea'}
          </button>
          <button
            type="button"
            style={btnPrimary}
            disabled={generateDisabled || generateLoading}
            onClick={() => void onGenerateEpisode()}
            onMouseEnter={(e) => {
              if (!generateDisabled && !generateLoading) {
                (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.08)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'none';
            }}
          >
            {generateLoading ? 'Generando…' : 'Generar episodio'}
          </button>
        </div>

        {queuedNotes.length > 0 && (
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p
              style={{
                margin: '0 0 0.65rem',
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Registrado en cola (se usa al generar capítulos)
            </p>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '10rem',
                overflowY: 'auto',
              }}
            >
              {queuedNotes.map((n) => {
                const preview = n.raw_plot_idea.replace(/\s+/g, ' ').trim();
                const short = preview.length > 160 ? `${preview.slice(0, 157)}…` : preview;
                return (
                  <li
                    key={n.id}
                    style={{
                      fontSize: '0.78rem',
                      lineHeight: 1.5,
                      color: 'rgba(255,255,255,0.72)',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '0.75rem',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    title={preview}
                  >
                    {short || '(vacío)'}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {localQueuedNotes.length > 0 && (
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(251, 191, 36, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                marginBottom: '0.65rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(251, 191, 36, 0.9)',
                }}
              >
                Solo en este dispositivo (reintenta cuando la API responda)
              </p>
              {onSyncLocalQueue && (
                <button
                  type="button"
                  disabled={localSyncLoading}
                  onClick={() => void onSyncLocalQueue()}
                  style={{
                    fontFamily: fontStack,
                    padding: '0.45rem 1rem',
                    borderRadius: 9999,
                    border: '1px solid rgba(251, 191, 36, 0.45)',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    letterSpacing: '0.06em',
                    cursor: localSyncLoading ? 'not-allowed' : 'pointer',
                    opacity: localSyncLoading ? 0.5 : 1,
                    background: 'rgba(251, 191, 36, 0.12)',
                    color: '#fde68a',
                  }}
                >
                  {localSyncLoading ? 'Sincronizando…' : 'Sincronizar cola local → Supabase'}
                </button>
              )}
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '8rem',
                overflowY: 'auto',
              }}
            >
              {localQueuedNotes.map((n) => {
                const preview = n.raw_plot_idea.replace(/\s+/g, ' ').trim();
                const short = preview.length > 140 ? `${preview.slice(0, 137)}…` : preview;
                return (
                  <li
                    key={n.localId}
                    style={{
                      fontSize: '0.76rem',
                      lineHeight: 1.5,
                      color: 'rgba(254, 243, 199, 0.88)',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '0.75rem',
                      background: 'rgba(251, 191, 36, 0.08)',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                    }}
                    title={preview}
                  >
                    {short || '(vacío)'}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {(onSkipTriangulationChange || onConsumeArchitectNotesChange) && (
        <div style={{
          marginTop: '1rem',
          padding: '0 0.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
        >
          {onSkipTriangulationChange && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.72rem',
              color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
            }}
            >
              <input
                type="checkbox"
                checked={skipTriangulation}
                onChange={(e) => onSkipTriangulationChange(e.target.checked)}
                style={{ accentColor: '#60a5fa' }}
              />
              Omitir triangulación (cola + runas)
            </label>
          )}
          {onConsumeArchitectNotesChange && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.72rem',
              color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
            }}
            >
              <input
                type="checkbox"
                checked={consumeArchitectNotes}
                onChange={(e) => onConsumeArchitectNotesChange(e.target.checked)}
                style={{ accentColor: '#60a5fa' }}
              />
              Consumir notas de la cola al generar
            </label>
          )}
        </div>
      )}
    </section>
  );
}
