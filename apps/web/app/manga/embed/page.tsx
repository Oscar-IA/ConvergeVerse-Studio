import dynamic from 'next/dynamic';

/**
 * Solo cliente: evita Flight/RSC + webpack al pre-renderizar el árbol con MangaFlipViewer en iframe.
 * Sin StudioShell (layout raíz): el embed no carga AppShell ni health en bucle.
 */
const MangaEmbedClient = dynamic(() => import('./MangaEmbedClient'), {
  ssr: false,
  loading: () => (
    <div
      className="font-datum"
      style={{
        minHeight: '120px',
        padding: '1rem',
        color: '#888',
        fontSize: '0.72rem',
        background: '#0c0c12',
      }}
    >
      Cargando vista libro…
    </div>
  ),
});

export default function MangaEmbedPage() {
  return <MangaEmbedClient />;
}
