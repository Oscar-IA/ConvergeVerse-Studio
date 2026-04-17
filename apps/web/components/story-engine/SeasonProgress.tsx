'use client';

/**
 * Barra de progreso de temporada (Libro Digital) — estilo «energía» acorde al Story Engine.
 * Equivalente visual al snippet Tailwind del diseño, sin depender de Tailwind en esta página.
 */
export function SeasonProgress({
  currentEpisode,
  totalEpisodes,
  seasonIndex,
  phaseKey,
  prequelSeeding,
  courEnabled,
}: {
  currentEpisode: number;
  totalEpisodes: number;
  seasonIndex: number;
  phaseKey?: string;
  prequelSeeding?: boolean;
  courEnabled: boolean;
}) {
  if (!courEnabled || totalEpisodes < 1) {
    return (
      <div
        style={{
          marginBottom: '1.25rem',
          padding: '0.65rem 1rem',
          borderRadius: '12px',
          border: '1px solid #2a2a1a',
          background: '#0c0c0c',
          fontSize: '0.58rem',
          color: '#666',
          letterSpacing: '0.08em',
        }}
      >
        Cour desactivado en configuración — no hay barra de temporada.
      </div>
    );
  }

  const progress = Math.min(100, Math.max(0, (currentEpisode / totalEpisodes) * 100));
  const seasonTitle =
    seasonIndex === 1 ? `Temporada ${seasonIndex}: El Legado` : `Temporada ${seasonIndex}`;

  return (
    <div
      style={{
        width: '100%',
        marginBottom: '1.25rem',
        padding: '1.25rem 1.5rem',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.75rem',
          marginBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            color: '#60a5fa',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.62rem',
          }}
        >
          {seasonTitle}
        </span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.62rem', letterSpacing: '0.04em' }}>
            Episodio {currentEpisode} / {totalEpisodes}
          </span>
          {phaseKey && phaseKey !== 'sin_inicio' && (
            <div style={{ color: '#6b7280', fontSize: '0.55rem', marginTop: '0.2rem' }}>
              {phaseKey.toUpperCase()}
              {prequelSeeding ? ' · semillas precuela' : ''}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          width: '100%',
          height: 8,
          background: '#1f2937',
          borderRadius: 9999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            borderRadius: 9999,
            background: 'linear-gradient(to right, #2563eb, #22d3ee)',
            boxShadow: '0 0 14px rgba(0, 180, 216, 0.45)',
            transition: 'width 0.35s ease-out',
          }}
        />
      </div>
      {prequelSeeding && (
        <p
          style={{
            margin: '0.65rem 0 0',
            fontSize: '0.55rem',
            color: '#c9a84c',
            lineHeight: 1.5,
            letterSpacing: '0.04em',
          }}
        >
          Episodio final del cour: el motor inyecta semillas de precuela (Laguna / multiverso) en el prompt.
        </p>
      )}
    </div>
  );
}
