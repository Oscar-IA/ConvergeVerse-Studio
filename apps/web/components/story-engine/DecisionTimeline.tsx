'use client';

export type TimelineEventRow = {
  id?: string | null;
  created_at?: string;
  pivot_canon_number?: number | null;
  pivot_day_number?: number;
  pivot_slot?: number;
  plot_pivot_note?: string;
  chapters_removed?: number;
  chapters_refined?: number;
  cascade_mode?: string;
};

type Props = {
  events: TimelineEventRow[];
  loading?: boolean;
};

function formatWhen(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Cronología de decisiones — línea temporal estilo “control de versiones”
 * para paradojas BOND OS (regenerar desde aquí).
 */
export function DecisionTimeline({ events, loading }: Props) {
  if (loading) {
    return (
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '1.25rem',
          background: 'rgba(20, 20, 28, 0.65)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.72rem',
          fontFamily: 'ui-monospace, system-ui, sans-serif',
          letterSpacing: '0.08em',
        }}
      >
        Cargando cronología…
      </div>
    );
  }

  if (!events.length) {
    return (
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '1.25rem',
          background: 'linear-gradient(165deg, rgba(28, 28, 36, 0.9) 0%, rgba(18, 18, 24, 0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.75rem',
          lineHeight: 1.5,
        }}
      >
        <div
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.35)',
            marginBottom: '0.5rem',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          CRONOLOGÍA DE DECISIONES
        </div>
        Aún no hay paradojas registradas. Al usar <strong style={{ color: 'rgba(248,113,113,0.9)' }}>Regenerar desde aquí</strong>, cada
        decisión queda anclada en esta línea temporal.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1.35rem 1.5rem 1.35rem 1.25rem',
        borderRadius: '1.35rem',
        background: 'linear-gradient(165deg, rgba(32, 30, 40, 0.92) 0%, rgba(14, 14, 20, 0.96) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
      }}
    >
      <div
        style={{
          fontSize: '0.62rem',
          letterSpacing: '0.24em',
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '1rem',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        CRONOLOGÍA DE DECISIONES
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
        <li
          aria-hidden
          style={{
            position: 'absolute',
            left: '10px',
            top: '6px',
            bottom: '6px',
            width: '2px',
            borderRadius: '2px',
            background: 'linear-gradient(180deg, rgba(248,113,113,0.5) 0%, rgba(167,139,250,0.35) 50%, rgba(56,189,248,0.25) 100%)',
          }}
        />
        {events.map((ev, i) => (
          <li
            key={ev.id || `ev-${i}`}
            style={{
              position: 'relative',
              paddingLeft: '2.15rem',
              paddingBottom: i === events.length - 1 ? 0 : '1.15rem',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '3px',
                top: '4px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #fecaca, #ef4444 45%, #7f1d1d)',
                boxShadow: '0 0 14px rgba(239,68,68,0.45)',
                border: '2px solid rgba(15,15,20,0.9)',
              }}
            />
            <div
              style={{
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.38)',
                fontFamily: 'ui-monospace, monospace',
                letterSpacing: '0.06em',
                marginBottom: '0.35rem',
              }}
            >
              {formatWhen(ev.created_at)}
              {ev.pivot_day_number != null && ev.pivot_slot != null && (
                <span style={{ marginLeft: '0.65rem', color: 'rgba(147,197,253,0.75)' }}>
                  D{ev.pivot_day_number}·S{ev.pivot_slot}
                  {ev.pivot_canon_number != null && ev.pivot_canon_number !== undefined
                    ? ` · canon #${ev.pivot_canon_number}`
                    : ''}
                </span>
              )}
              {typeof ev.chapters_removed === 'number' && ev.chapters_removed > 0 && (
                <span style={{ marginLeft: '0.5rem', color: 'rgba(248,113,113,0.75)' }}>
                  −{ev.chapters_removed} cap.
                </span>
              )}
              {ev.cascade_mode === 'soft_enrich' && (
                <span
                  style={{
                    marginLeft: '0.5rem',
                    padding: '1px 8px',
                    borderRadius: '999px',
                    background: 'rgba(52, 211, 153, 0.2)',
                    border: '1px solid rgba(52, 211, 153, 0.35)',
                    color: '#6ee7b7',
                    fontSize: '0.58rem',
                    letterSpacing: '0.08em',
                  }}
                >
                  ENRIQUECER
                </span>
              )}
              {ev.cascade_mode === 'hard_reset' && (
                <span
                  style={{
                    marginLeft: '0.5rem',
                    padding: '1px 8px',
                    borderRadius: '999px',
                    background: 'rgba(248, 113, 113, 0.15)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    color: '#fca5a5',
                    fontSize: '0.58rem',
                    letterSpacing: '0.08em',
                  }}
                >
                  HARD RESET
                </span>
              )}
              {typeof ev.chapters_refined === 'number' && ev.chapters_refined > 0 && (
                <span style={{ marginLeft: '0.35rem', color: 'rgba(110, 231, 183, 0.85)' }}>
                  +{ev.chapters_refined} refinados
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                lineHeight: 1.45,
                color: 'rgba(248, 250, 252, 0.88)',
                fontWeight: 500,
              }}
            >
              {(ev.plot_pivot_note || '').trim() || '— (sin nota de trama)'}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
