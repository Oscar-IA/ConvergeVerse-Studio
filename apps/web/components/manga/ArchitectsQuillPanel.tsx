'use client';

import type { StudioCastEntry } from '@/lib/api/types';

const EXAMPLE_BEAT =
  'Paula sana a Aren después de que este se cayera de un risco persiguiendo una mariposa; Luis suspira como Rey General; Yaritza estabiliza el bosque dañado alrededor.';

type Props = {
  studioCast: StudioCastEntry[] | undefined;
};

/**
 * The Architect's Quill — mapa del flujo de producción y reparto familiar.
 */
export function ArchitectsQuillPanel({ studioCast }: Props) {
  return (
    <section className="architects-quill surface" aria-labelledby="architects-quill-heading">
      <div className="architects-quill__head">
        <div className="architects-quill__brand">
          <span className="architects-quill__glyph" aria-hidden>
            ✒
          </span>
          <div>
            <h2 id="architects-quill-heading" className="architects-quill__title font-cinzel">
              The Architect&apos;s Quill
            </h2>
            <p className="architects-quill__tagline font-inter">
              Escribís el <strong>beat</strong> · la IA expande con vuestro reparto · corrector ES/EN/FR · 2 paneles manga ·
              metadatos VFX anime
            </p>
          </div>
        </div>
      </div>

      <ol className="architects-quill__flow font-datum">
        <li>
          <span className="architects-quill__step">1 · Novela</span>
          <span className="architects-quill__desc font-inter">
            Un beat corto; el modelo integra a la familia en sus roles (sanación, eco, mando, domadores, calamidad Aren).
          </span>
        </li>
        <li>
          <span className="architects-quill__step">2 · Corrector</span>
          <span className="architects-quill__desc font-inter">
            Limpieza multilingüe en beat y novela (ES / EN / FR + léxico lore).
          </span>
        </li>
        <li>
          <span className="architects-quill__step">3 · Manga</span>
          <span className="architects-quill__desc font-inter">
            Dos paneles que condensan la escena coral (ej. Luis suspirando, Yaritza reparando el bosque, Paula con Aren).
          </span>
        </li>
        <li>
          <span className="architects-quill__step">4 · Anime</span>
          <span className="architects-quill__desc font-inter">
            Metadatos de efectos especiales (director + JSON técnico camera / partículas / SFX).
          </span>
        </li>
      </ol>

      <div className="architects-quill__cast font-inter">
        <span className="architects-quill__cast-label font-cinzel">Reparto Architect</span>
        {studioCast && studioCast.length > 0 ? (
          <ul className="architects-quill__cast-list">
            {studioCast.map((c) => (
              <li key={c.id ?? c.name}>
                <strong>{c.name}</strong>
                {c['class'] ? <span className="architects-quill__class"> · {c['class']}</span> : null}
                {c.ability ? <span className="architects-quill__ability"> — {c.ability}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="architects-quill__cast-empty font-datum">
            Cargá el API: <code>studio_cast</code> viene de <code>apps/api/data/characters.json</code>
          </p>
        )}
      </div>

      <p className="architects-quill__hint font-inter">
        <strong>Ejemplo de beat:</strong> {EXAMPLE_BEAT}
      </p>
    </section>
  );
}

export { EXAMPLE_BEAT };
