'use client';

import { useState } from 'react';

export type LoreAnnexBestiaryEntry = {
  name?: string;
  species_or_faction?: string;
  description?: string;
  threat_level?: string;
};

export type LoreAnnexFicha = {
  aren_snapshot?: string;
  abilities_observed?: string[];
  evolution_note?: string;
};

export type LoreAnnexRuna = {
  glyph_or_name?: string;
  meaning?: string;
  usage_in_episode?: string;
};

export type LoreAnnex = {
  generated_at?: string;
  source?: string;
  bestiary?: LoreAnnexBestiaryEntry[];
  ficha_tecnica?: LoreAnnexFicha;
  diccionario_runico?: LoreAnnexRuna[];
};

export function LoreAnnexSection({ annex }: { annex: LoreAnnex }) {
  const [open, setOpen] = useState(true);
  const bestiary = annex.bestiary ?? [];
  const ficha = annex.ficha_tecnica ?? {};
  const runas = annex.diccionario_runico ?? [];
  const src = annex.source ?? '?';

  return (
    <div style={{
      marginBottom: '1rem',
      border: '1px solid #2a3a4a',
      borderRadius: '8px',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #0a1018 0%, #080c12 100%)',
    }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '0.55rem 0.75rem',
          border: 'none',
          borderBottom: open ? '1px solid #1a2a38' : 'none',
          background: 'rgba(74, 223, 255, 0.06)',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '0.58rem',
          letterSpacing: '0.14em',
          color: '#7dd3fc',
        }}
      >
        {open ? '▼' : '▶'} ANEXO DE LORE · Libro Digital
        <span style={{ marginLeft: '0.75rem', color: '#556', fontWeight: 400, letterSpacing: '0.08em' }}>
          ({src === 'llm' ? 'Claude' : src === 'structural' ? 'heurística' : src})
        </span>
      </button>
      {open && (
        <div style={{ padding: '0.75rem 0.85rem' }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.5rem',
            color: '#456',
            marginBottom: '0.75rem',
            letterSpacing: '0.06em',
          }}
          >
            {annex.generated_at ? `Generado: ${annex.generated_at}` : ''}
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.55rem',
              letterSpacing: '0.18em',
              color: '#a78bfa',
              marginBottom: '0.4rem',
            }}
            >
              BESTIARIO
            </div>
            {bestiary.length === 0 ? (
              <p style={{ fontSize: '0.65rem', color: '#666', margin: 0 }}>Sin entradas.</p>
            ) : (
              bestiary.map((b, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    background: '#0c0c14',
                    borderRadius: '4px',
                    border: '1px solid #2a2438',
                  }}
                >
                  <div style={{ color: '#c4b5fd', fontSize: '0.68rem', fontWeight: 700 }}>
                    {b.name || '—'}
                    <span style={{ color: '#6b7280', fontWeight: 400, marginLeft: '0.35rem' }}>
                      [{b.species_or_faction || '—'}]
                    </span>
                  </div>
                  {b.threat_level && b.threat_level !== '—' && (
                    <div style={{ fontSize: '0.55rem', color: '#f87171', marginTop: '0.2rem' }}>
                      Amenaza: {b.threat_level}
                    </div>
                  )}
                  <p style={{ fontSize: '0.65rem', color: '#9ca3af', lineHeight: 1.55, margin: '0.35rem 0 0' }}>
                    {b.description || '—'}
                  </p>
                </div>
              ))
            )}
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.55rem',
              letterSpacing: '0.18em',
              color: '#4ade80',
              marginBottom: '0.4rem',
            }}
            >
              FICHA TÉCNICA — AREN
            </div>
            {ficha.aren_snapshot && (
              <p style={{ fontSize: '0.65rem', color: '#86efac', lineHeight: 1.55, margin: '0 0 0.45rem' }}>
                {ficha.aren_snapshot}
              </p>
            )}
            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#a7f3d0', fontSize: '0.64rem', lineHeight: 1.6 }}>
              {(ficha.abilities_observed ?? []).map((a, j) => (
                <li key={j}>{a}</li>
              ))}
            </ul>
            {ficha.evolution_note && (
              <p style={{ fontSize: '0.62rem', color: '#6ee7b7', lineHeight: 1.55, margin: '0.45rem 0 0', fontStyle: 'italic' }}>
                {ficha.evolution_note}
              </p>
            )}
          </div>

          <div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.55rem',
              letterSpacing: '0.18em',
              color: '#fbbf24',
              marginBottom: '0.4rem',
            }}
            >
              DICCIONARIO RÚNICO
            </div>
            {runas.length === 0 ? (
              <p style={{ fontSize: '0.65rem', color: '#666', margin: 0 }}>Sin entradas.</p>
            ) : (
              runas.map((r, k) => (
                <div
                  key={k}
                  style={{
                    marginBottom: '0.45rem',
                    padding: '0.45rem 0.5rem',
                    background: '#121008',
                    borderRadius: '4px',
                    border: '1px solid #3a3020',
                  }}
                >
                  <div style={{ color: '#fcd34d', fontSize: '0.68rem', fontFamily: 'monospace' }}>
                    {r.glyph_or_name || '—'}
                  </div>
                  <p style={{ fontSize: '0.62rem', color: '#a8a29e', margin: '0.25rem 0 0', lineHeight: 1.5 }}>
                    {r.meaning}
                  </p>
                  <p style={{ fontSize: '0.58rem', color: '#78716c', margin: '0.25rem 0 0', lineHeight: 1.45 }}>
                    Episodio: {r.usage_in_episode || '—'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
