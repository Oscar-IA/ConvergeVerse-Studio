'use client';

// Force dynamic rendering — this page uses headers() via next-intl
export const dynamic = 'force-dynamic';

import { MangaStudio } from '@/components/manga/MangaStudio';

/**
 * Dashboard de producción: inventario lore · editor [BORRADOR|NOVELA|GUION] · paneles/VFX · pie corrector ES/EN/FR.
 * Anime ambient layer wraps the professional studio for visual consistency.
 */
export default function MangaPage() {
  return (
    <div className="page-directors-cut page-production-dashboard" style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Anime ambient background — non-interactive layer */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
      }}>
        <style>{`
          @keyframes mgs-float { 0%,100%{transform:translateY(0) scale(1);opacity:0} 8%{opacity:0.5} 92%{opacity:0.15} 100%{transform:translateY(-100vh);opacity:0} }
          @keyframes mgs-twink { 0%,100%{opacity:0.1} 50%{opacity:0.4} }
          @keyframes mgs-streak { 0%{transform:translateX(-200px);opacity:0} 40%{opacity:0.3} 100%{transform:translateX(110vw);opacity:0} }
          .mgs-dot { position:absolute; border-radius:50%; animation:mgs-float linear infinite; }
          .mgs-star { position:absolute; width:2px; height:2px; border-radius:50%; animation:mgs-twink ease-in-out infinite; }
          .mgs-streak { position:absolute; height:1px; animation:mgs-streak linear infinite; }
        `}</style>

        {/* Floating ink particles */}
        {[
          { l: '3%',  t: '82%', s: 4, d: 14, c: '#8b5cf6' },
          { l: '12%', t: '65%', s: 3, d: 18, c: '#ec4899' },
          { l: '25%', t: '90%', s: 5, d: 12, c: '#06b6d4' },
          { l: '50%', t: '78%', s: 3, d: 20, c: '#8b5cf6' },
          { l: '70%', t: '88%', s: 4, d: 16, c: '#f97316' },
          { l: '85%', t: '72%', s: 3, d: 11, c: '#ec4899' },
          { l: '95%', t: '80%', s: 5, d: 15, c: '#06b6d4' },
        ].map((p, i) => (
          <div key={i} className="mgs-dot" style={{
            left: p.l, top: p.t, width: p.s, height: p.s,
            background: p.c, opacity: 0.25,
            animationDuration: `${p.d}s`, animationDelay: `${i * 2.3}s`,
          }} />
        ))}

        {/* Stars */}
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="mgs-star" style={{
            left: `${(i * 6 + 4) % 100}%`,
            top: `${(i * 9 + 3) % 55}%`,
            background: i % 3 === 0 ? '#8b5cf6' : i % 3 === 1 ? '#ec4899' : '#06b6d4',
            animationDuration: `${2 + i % 4}s`,
            animationDelay: `${i * 0.5}s`,
          }} />
        ))}

        {/* Speed streaks */}
        {[
          { t: '15%', w: 80, d: 6, c: '#8b5cf6', dl: 0 },
          { t: '35%', w: 50, d: 9, c: '#ec4899', dl: 3 },
          { t: '60%', w: 100, d: 7, c: '#06b6d4', dl: 5 },
        ].map((s, i) => (
          <div key={i} className="mgs-streak" style={{
            top: s.t, left: '-200px', width: s.w,
            background: `linear-gradient(90deg,transparent,${s.c},transparent)`,
            animationDuration: `${s.d}s`, animationDelay: `${s.dl}s`,
            opacity: 0.12,
          }} />
        ))}
      </div>

      {/* Studio content above the ambient layer */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <MangaStudio />
      </div>
    </div>
  );
}
