'use client';

import { getApiBaseUrl } from '@/lib/config';
import { useCallback, useEffect, useState } from 'react';

type CreativeRef = {
  id: string;
  title: string;
  media_type: string;
  key_elements: string[] | null;
  notes?: string | null;
};

type IdeationIdea = {
  id: string;
  concept_name: string;
  description?: string | null;
  category?: string | null;
  integration_style?: string | null;
};

function parseElements(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

export function CreativeHub() {
  const [refs, setRefs] = useState<CreativeRef[]>([]);
  const [ideas, setIdeas] = useState<IdeationIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRefForm, setShowRefForm] = useState(false);
  const [showIdeaForm, setShowIdeaForm] = useState(false);

  const [refTitle, setRefTitle] = useState('');
  const [refMedia, setRefMedia] = useState('anime');
  const [refElements, setRefElements] = useState('');
  const [refNotes, setRefNotes] = useState('');

  const [ideaName, setIdeaName] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [ideaCategory, setIdeaCategory] = useState('');
  const [ideaStyle, setIdeaStyle] = useState('');

  const base = getApiBaseUrl();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/creative-hub`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const d = (j as { detail?: unknown }).detail;
        throw new Error(typeof d === 'string' ? d : `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRefs(data.references || []);
      setIdeas(data.ideas || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  const submitRef = async () => {
    const key_elements = refElements
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch(`${base}/api/add-reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: refTitle,
        media_type: refMedia,
        key_elements,
        notes: refNotes,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { detail?: string }).detail || 'Error al guardar');
    }
    setRefTitle('');
    setRefElements('');
    setRefNotes('');
    setShowRefForm(false);
    await load();
  };

  const submitIdea = async () => {
    const res = await fetch(`${base}/api/add-idea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_name: ideaName,
        description: ideaDesc,
        category: ideaCategory,
        integration_style: ideaStyle,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { detail?: string }).detail || 'Error al guardar');
    }
    setIdeaName('');
    setIdeaDesc('');
    setIdeaCategory('');
    setIdeaStyle('');
    setShowIdeaForm(false);
    await load();
  };

  return (
    <div className="creative-hub">
      <header className="creative-hub__header">
        <h1 className="creative-hub__title">BOND OS · Creative Core</h1>
        <p className="creative-hub__subtitle font-datum">
          Referencias visuales y bóveda de tono — minimal, Apple-like
        </p>
      </header>

      {error && <div className="creative-hub__error font-datum">{error}</div>}
      {loading && <div className="creative-hub__loading font-datum">Cargando…</div>}

      <div className="creative-hub__grid">
        <section className="creative-hub__panel creative-hub__panel--blue">
          <h2 className="creative-hub__panel-title">ADN de referencia</h2>
          <p className="creative-hub__panel-hint font-datum">Anime · cine · composición</p>
          <div className="creative-hub__scroll">
            {refs.map((ref) => (
              <article key={ref.id} className="creative-hub__card">
                <p className="creative-hub__card-title">
                  {ref.title}{' '}
                  <span className="creative-hub__tag creative-hub__tag--muted">
                    [{ref.media_type}]
                  </span>
                </p>
                {ref.notes ? (
                  <p className="creative-hub__card-notes font-datum">{ref.notes}</p>
                ) : null}
                <div className="creative-hub__chips">
                  {parseElements(ref.key_elements).map((el) => (
                    <span key={el} className="creative-hub__chip creative-hub__chip--blue">
                      {el}
                    </span>
                  ))}
                </div>
              </article>
            ))}
            {!loading && refs.length === 0 && (
              <p className="creative-hub__empty font-datum">Aún no hay referencias.</p>
            )}
          </div>
          <button
            type="button"
            className="creative-hub__btn creative-hub__btn--blue"
            onClick={() => setShowRefForm(true)}
          >
            + Añadir referencia
          </button>
        </section>

        <section className="creative-hub__panel creative-hub__panel--purple">
          <h2 className="creative-hub__panel-title">Bóveda de ideas &amp; tono</h2>
          <p className="creative-hub__panel-hint font-datum">Humor · lore · integración</p>
          <div className="creative-hub__scroll">
            {ideas.map((idea) => (
              <article key={idea.id} className="creative-hub__card">
                <p className="creative-hub__card-title creative-hub__card-title--purple">
                  {idea.concept_name}
                </p>
                {idea.description ? (
                  <p className="creative-hub__card-desc font-datum">{idea.description}</p>
                ) : null}
                {idea.category ? (
                  <span className="creative-hub__chip creative-hub__chip--purple creative-hub__chip--cat">
                    {idea.category}
                  </span>
                ) : null}
                {idea.integration_style ? (
                  <span className="creative-hub__chip creative-hub__chip--purple creative-hub__chip--style">
                    {idea.integration_style}
                  </span>
                ) : null}
              </article>
            ))}
            {!loading && ideas.length === 0 && (
              <p className="creative-hub__empty font-datum">Aún no hay ideas.</p>
            )}
          </div>
          <button
            type="button"
            className="creative-hub__btn creative-hub__btn--purple"
            onClick={() => setShowIdeaForm(true)}
          >
            + Plantar nueva idea
          </button>
        </section>
      </div>

      {showRefForm && (
        <div className="creative-hub__modal-backdrop" role="presentation">
          <div className="creative-hub__modal">
            <h3 className="creative-hub__modal-title">Nueva referencia</h3>
            <label className="creative-hub__label font-datum">Título</label>
            <input
              className="creative-hub__input"
              value={refTitle}
              onChange={(e) => setRefTitle(e.target.value)}
              placeholder="Ej. Cowboy Bebop — composición"
            />
            <label className="creative-hub__label font-datum">Tipo de medio</label>
            <input
              className="creative-hub__input"
              value={refMedia}
              onChange={(e) => setRefMedia(e.target.value)}
              placeholder="anime | film | art"
            />
            <label className="creative-hub__label font-datum">Elementos clave (coma)</label>
            <input
              className="creative-hub__input"
              value={refElements}
              onChange={(e) => setRefElements(e.target.value)}
              placeholder="luz lateral, siluetas, pacing"
            />
            <label className="creative-hub__label font-datum">Notas</label>
            <textarea
              className="creative-hub__textarea"
              value={refNotes}
              onChange={(e) => setRefNotes(e.target.value)}
              rows={3}
            />
            <div className="creative-hub__modal-actions">
              <button
                type="button"
                className="creative-hub__btn creative-hub__btn--ghost"
                onClick={() => setShowRefForm(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="creative-hub__btn creative-hub__btn--blue"
                disabled={!refTitle.trim()}
                onClick={() => submitRef().catch((e) => setError(String(e.message)))}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showIdeaForm && (
        <div className="creative-hub__modal-backdrop" role="presentation">
          <div className="creative-hub__modal">
            <h3 className="creative-hub__modal-title">Nueva idea</h3>
            <label className="creative-hub__label font-datum">Nombre del concepto</label>
            <input
              className="creative-hub__input"
              value={ideaName}
              onChange={(e) => setIdeaName(e.target.value)}
            />
            <label className="creative-hub__label font-datum">Descripción</label>
            <textarea
              className="creative-hub__textarea"
              value={ideaDesc}
              onChange={(e) => setIdeaDesc(e.target.value)}
              rows={3}
            />
            <label className="creative-hub__label font-datum">Categoría</label>
            <input
              className="creative-hub__input"
              value={ideaCategory}
              onChange={(e) => setIdeaCategory(e.target.value)}
              placeholder="humor | lore | personaje"
            />
            <label className="creative-hub__label font-datum">Estilo de integración</label>
            <input
              className="creative-hub__input"
              value={ideaStyle}
              onChange={(e) => setIdeaStyle(e.target.value)}
              placeholder="sutil | Konosuba | épico"
            />
            <div className="creative-hub__modal-actions">
              <button
                type="button"
                className="creative-hub__btn creative-hub__btn--ghost"
                onClick={() => setShowIdeaForm(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="creative-hub__btn creative-hub__btn--purple"
                disabled={!ideaName.trim()}
                onClick={() => submitIdea().catch((e) => setError(String(e.message)))}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
