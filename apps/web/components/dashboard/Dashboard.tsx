'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { loadBondStories, autoSaveBondStory, parseBondFile, seedDemoStory, hasDemoStory } from '@/lib/bondSave'
import type { BondStory } from '@/lib/bondSave'
import { useKidsMode } from '@/hooks/useKidsMode'
import { useUserProfile } from '@/hooks/useUserProfile'

// ─────────────────────────────────────────────────────────────────────────────
// Tips (bilingual, used in any mode)
// ─────────────────────────────────────────────────────────────────────────────

const TIPS: Array<{ en: string; es: string }> = [
  { en: '💡 Start your hero with a big dream',                     es: '💡 Empieza con un héroe que tenga un gran sueño' },
  { en: '🌟 The best villains believe they are right',             es: '🌟 Los mejores villanos también creen que tienen razón' },
  { en: '🎭 Give your special move an amazing name',               es: '🎭 Dale un nombre genial a tu técnica especial' },
  { en: '📖 End every chapter with a surprise',                    es: '📖 Cada capítulo debe terminar con una sorpresa' },
  { en: '🤝 Your hero needs a loyal best friend',                  es: '🤝 Tu protagonista necesita un mejor amigo fiel' },
  { en: '⚡ The coolest powers always have a price',               es: '⚡ Los poderes más cool tienen un costo' },
  { en: '🌈 Describe the colors of your world in detail',         es: '🌈 Describe los colores de tu mundo con detalle' },
  { en: '🗺️ Draw the map of your imaginary world',               es: '🗺️ Dibuja el mapa de tu mundo imaginario' },
  { en: '🔥 A great villain makes the hero even stronger',         es: '🔥 Un buen villano hace más fuerte al héroe' },
  { en: '🌙 Night scenes always feel more mysterious',             es: '🌙 Las escenas de noche son más misteriosas' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Anxiety-safe feedback helper
// Maps technical error strings → calm, encouraging messages
// ─────────────────────────────────────────────────────────────────────────────

export const CALM_MESSAGES = {
  fileError:   { en: "That file didn't open — that's totally okay! Try a different .bond file 😊",       es: "Ese archivo no se abrió — ¡está bien! Intenta con otro archivo .bond 😊" },
  fileOk:      { en: "Story loaded! Let's go! ✅",                                                        es: "¡Historia cargada! ¡Vamos! ✅" },
  saveOk:      { en: "Saved safely to your computer! 💾",                                                 es: "¡Guardado en tu computadora! 💾" },
  noStories:   { en: "You haven't created a story yet — and that's exciting! Your first one is next! 🚀", es: "¡Aún no tienes historias — y eso es emocionante! ¡La primera viene! 🚀" },
  reassure:    { en: "Everything is saved automatically. You can't break anything! 💚",                   es: "Todo se guarda automáticamente. ¡No puedes romper nada! 💚" },
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function bi(en: string, es: string, isBilingual: boolean, isEs: boolean): string {
  if (isBilingual) return en; // bilingual users see EN first; ES appears as subtitle
  return isEs ? es : en;
}

function BiLine({ en, es, bilingual, isEs, style }: {
  en: string; es: string; bilingual: boolean; isEs: boolean; style?: React.CSSProperties
}) {
  if (!bilingual) return <span style={style}>{isEs ? es : en}</span>;
  return (
    <span style={style}>
      {en}
      <span style={{ display: 'block', fontSize: '0.82em', opacity: 0.5, marginTop: 2 }}>{es}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Personalized Welcome Banner (shown when a profile exists)
// ─────────────────────────────────────────────────────────────────────────────

function WelcomeBanner({ name, emoji, color, anxiety, bilingual, isEs }: {
  name: string; emoji: string; color: string; anxiety: boolean; bilingual: boolean; isEs: boolean;
}) {
  const [greeting, setGreeting] = useState('');
  const [visible,  setVisible]  = useState(false);

  const greetingsEn = [
    `Hi ${name}! Ready to create? 🌟`,
    `Welcome back, ${name}! Let's make something awesome! ✨`,
    `Hey ${name}! Your story is waiting! 📖`,
    `Great to see you, ${name}! Let's build a new world! 🌍`,
  ];
  const greetingsEs = [
    `¡Hola ${name}! ¿Listo para crear? 🌟`,
    `¡Bienvenido de nuevo, ${name}! ¡Hagamos algo increíble! ✨`,
    `¡Oye ${name}! ¡Tu historia te espera! 📖`,
    `¡Qué bueno verte, ${name}! ¡Construyamos un mundo! 🌍`,
  ];

  useEffect(() => {
    const pool = bilingual || !isEs ? greetingsEn : greetingsEs;
    setGreeting(pool[Math.floor(Math.random() * pool.length)]);
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const taglineEn = `You're going to create something amazing today!`;
  const taglineEs = `¡Hoy vas a crear algo increíble!`;

  return (
    <div style={{
      position: 'relative',
      padding: anxiety ? '36px 28px 32px' : '28px 24px',
      borderRadius: 24,
      marginBottom: 28,
      background: `linear-gradient(135deg, ${color}18 0%, ${color}08 50%, rgba(139,92,246,0.08) 100%)`,
      border: `2px solid ${color}40`,
      boxShadow: anxiety
        ? `0 0 40px ${color}15, 0 4px 24px rgba(0,0,0,0.3)` // calm glow
        : `0 0 60px ${color}25`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      overflow: 'hidden',
    }}>
      {/* Subtle pattern — calm, not flashy */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, ${color}12 1px, transparent 1px)`,
        backgroundSize: anxiety ? '28px 28px' : '18px 18px',
        opacity: 0.6,
      }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Avatar + greeting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{
            fontSize: anxiety ? 52 : 44,
            lineHeight: 1,
            animation: anxiety ? 'bond-gentle-bob 3s ease-in-out infinite' : 'bond-bounce 2s ease-in-out infinite',
            flexShrink: 0,
          }}>
            {emoji}
          </div>
          <div>
            <h1 style={{
              fontSize: 'clamp(1.4rem, 4vw, 2rem)',
              fontWeight: 900,
              margin: 0,
              color: '#fff',
              lineHeight: 1.15,
            }}>
              {greeting}
            </h1>
            {bilingual ? (
              <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.55, color: '#e2e8f0' }}>
                {greetingsEs[0]}
              </p>
            ) : null}
          </div>
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: anxiety ? 16 : 14,
          color: color,
          margin: 0,
          fontWeight: 600,
          opacity: 0.9,
        }}>
          {bi(taglineEn, taglineEs, bilingual, isEs)}
          {bilingual && <span style={{ display: 'block', fontSize: '0.85em', opacity: 0.5 }}>{taglineEs}</span>}
        </p>

        {/* Anxiety reassurance */}
        {anxiety && (
          <div style={{
            marginTop: 14,
            padding: '10px 16px',
            borderRadius: 12,
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.2)',
            fontSize: 13,
            color: '#86efac',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>💚</span>
            <BiLine en={CALM_MESSAGES.reassure.en} es={CALM_MESSAGES.reassure.es} bilingual={bilingual} isEs={isEs} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic hero banner (shown when no profile)
// ─────────────────────────────────────────────────────────────────────────────

function HeroBanner({ kidsMode }: { kidsMode: boolean }) {
  const t = useTranslations('dashboard');
  return (
    <div style={{
      position: 'relative', marginBottom: 32,
      padding: kidsMode ? '40px 24px' : '32px 24px',
      overflow: 'hidden', borderRadius: 24,
      background: 'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(139,92,246,0.15) 50%, rgba(56,189,248,0.1) 100%)',
      border: '2px solid rgba(236,72,153,0.25)',
      boxShadow: '0 0 60px rgba(236,72,153,0.1)',
    }}>
      <svg aria-hidden style={{ position: 'absolute', right: -20, top: -20, opacity: 0.18, pointerEvents: 'none' }}
        width="260" height="260" viewBox="0 0 260 260">
        <polygon points="130,10 155,90 240,90 175,140 200,220 130,170 60,220 85,140 20,90 105,90"
          fill="none" stroke="#ec4899" strokeWidth="3" />
        <circle cx="130" cy="130" r="40" fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="6 4" />
      </svg>
      <div style={{ fontSize: kidsMode ? 80 : 64, textAlign: 'center', marginBottom: 12, animation: 'bond-bounce 2s ease-in-out infinite', display: 'block' }}>🦸</div>
      <h1 style={{
        textAlign: 'center', fontSize: 'clamp(1.4rem,5vw,2.4rem)', fontWeight: 900, margin: '0 0 8px',
        background: 'linear-gradient(135deg,#fff 0%,#ec4899 60%,#a855f7 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>{t('heroTitle')}</h1>
      <p style={{ textAlign: 'center', fontSize: 15, color: '#94a3b8', marginBottom: 28 }}>{t('heroSubtitle')}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        {[{e:'💡',k:'step1'},{e:null,k:null},{e:'✍️',k:'step2'},{e:null,k:null},{e:'💾',k:'step3'}].map((s,i) =>
          s.k ? (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '12px 20px', background: 'rgba(255,255,255,0.07)',
              border: '2px solid rgba(255,255,255,0.15)', borderRadius: 16, minWidth: 90,
              animation: `bond-pop-in 0.4s ease ${i*0.08}s both`,
            }}>
              <span style={{ fontSize: 32 }}>{s.e}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{t(s.k as 'step1'|'step2'|'step3')}</span>
            </div>
          ) : <span key={i} style={{ fontSize: 22, color: 'rgba(255,255,255,0.3)' }}>→</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Anxiety-safe Action Layout (one primary CTA + secondary row)
// ─────────────────────────────────────────────────────────────────────────────

function AnxietyActionLayout({ color, bilingual, isEs }: { color: string; bilingual: boolean; isEs: boolean }) {
  const t = useTranslations('dashboard');
  const [showMore, setShowMore] = useState(false);
  const [primaryHov, setPrimaryHov] = useState(false);

  const secondary = [
    { href: '/manga',      emoji: '🎨', labelEn: t('actionDraw'),      labelEs: '¡Mis Dibujos!' },
    { href: '/series',     emoji: '📚', labelEn: t('actionSeries'),    labelEs: 'Mis Series' },
    { href: '/templates',  emoji: '🌸', labelEn: t('actionTemplates'), labelEs: 'Plantillas' },
  ];

  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 20 }}>
        <BiLine en="What do you want to do? 🚀" es="¿Qué quieres hacer? 🚀" bilingual={bilingual} isEs={isEs} />
      </h2>

      {/* PRIMARY big button */}
      <Link href="/story-engine"
        onMouseEnter={() => setPrimaryHov(true)}
        onMouseLeave={() => setPrimaryHov(false)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '32px 24px',
          background: primaryHov
            ? `linear-gradient(135deg, ${color}, #a855f7)`
            : `linear-gradient(135deg, ${color}30, ${color}15)`,
          border: `3px solid ${primaryHov ? color : color + '60'}`,
          borderRadius: 24, textDecoration: 'none',
          boxShadow: primaryHov
            ? `0 12px 0 rgba(0,0,0,0.4), 0 0 60px ${color}50`
            : `0 6px 0 rgba(0,0,0,0.4), 0 0 30px ${color}20`,
          transform: primaryHov ? 'translateY(-6px)' : 'translateY(0)',
          transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          marginBottom: 16,
        }}>
        <span style={{ fontSize: 64, animation: primaryHov ? 'bond-wiggle 0.4s ease' : 'bond-gentle-bob 3s ease-in-out infinite' }}>✨</span>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
          {bilingual ? (
            <>
              {t('actionCreate')}
              <span style={{ display: 'block', fontSize: '0.7em', opacity: 0.55 }}>{t('actionCreate')}</span>
            </>
          ) : t('actionCreate')}
        </span>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.4, maxWidth: 280 }}>
          <BiLine
            en={t('actionCreateSub')}
            es={t('actionCreateSub')}
            bilingual={bilingual} isEs={isEs}
          />
        </span>
        {/* Step hint */}
        <div style={{
          marginTop: 4, padding: '6px 16px',
          background: 'rgba(255,255,255,0.1)', borderRadius: 20,
          fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600,
        }}>
          <BiLine en="Step 1 of 3 · Takes about 2 minutes" es="Paso 1 de 3 · Toma 2 minutos" bilingual={bilingual} isEs={isEs} />
        </div>
      </Link>

      {/* SECONDARY — collapsed by default for anxiety users */}
      <button
        onClick={() => setShowMore(v => !v)}
        style={{
          width: '100%', padding: '10px 0',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, color: 'rgba(255,255,255,0.4)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', marginBottom: 12,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
      >
        {showMore
          ? <BiLine en="▲ Hide other options" es="▲ Ocultar otras opciones" bilingual={bilingual} isEs={isEs} />
          : <BiLine en="✦ See all options" es="✦ Ver todas las opciones" bilingual={bilingual} isEs={isEs} />
        }
      </button>

      {showMore && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
          animation: 'bond-pop-in 0.3s ease both',
        }}>
          {secondary.map(card => (
            <SecondaryCard key={card.href} href={card.href} emoji={card.emoji}
              labelEn={card.labelEn} labelEs={card.labelEs} bilingual={bilingual} isEs={isEs} />
          ))}
        </div>
      )}
    </div>
  );
}

function SecondaryCard({ href, emoji, labelEn, labelEs, bilingual, isEs }: {
  href: string; emoji: string; labelEn: string; labelEs: string; bilingual: boolean; isEs: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={href} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '16px 8px',
      background: hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
      border: `2px solid ${hov ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 16, textDecoration: 'none',
      transform: hov ? 'translateY(-3px)' : 'translateY(0)',
      transition: 'all 0.2s',
    }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      <span style={{ fontSize: 32 }}>{emoji}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', textAlign: 'center', lineHeight: 1.3 }}>
        {bi(labelEn, labelEs, bilingual, isEs)}
      </span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard Action Grid (non-anxiety users)
// ─────────────────────────────────────────────────────────────────────────────

function ActionGrid({ kidsMode }: { kidsMode: boolean }) {
  const t = useTranslations('dashboard');
  const cards = [
    { href: '/story-engine', emoji: '✨', lk: 'actionCreate', sk: 'actionCreateSub', g: 'linear-gradient(135deg,#ec4899,#db2777)', glow: 'rgba(236,72,153,0.5)', d: '0s' },
    { href: '/manga',        emoji: '🎨', lk: 'actionDraw',   sk: 'actionDrawSub',   g: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', glow: 'rgba(139,92,246,0.5)',  d: '0.05s' },
    { href: '/series',       emoji: '📚', lk: 'actionSeries', sk: 'actionSeriesSub', g: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', glow: 'rgba(56,189,248,0.5)',  d: '0.1s' },
    { href: '/templates',    emoji: '🌸', lk: 'actionTemplates', sk: 'actionTemplatesSub', g: 'linear-gradient(135deg,#fb923c,#ea580c)', glow: 'rgba(251,146,60,0.5)', d: '0.15s' },
  ] as const;

  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: kidsMode ? 20 : 18, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
        {t('whatToDo')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: kidsMode ? 16 : 14 }}>
        {cards.map(c => <ActionCard key={c.href} card={c} label={t(c.lk)} sub={t(c.sk)} kidsMode={kidsMode} />)}
      </div>
    </div>
  );
}

function ActionCard({ card, label, sub, kidsMode }: {
  card: { href: string; emoji: string; g: string; glow: string; d: string };
  label: string; sub: string; kidsMode: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={card.href} className="btn-action" style={{
      background: hov ? card.g : 'rgba(255,255,255,0.06)',
      minHeight: kidsMode ? 150 : 130, position: 'relative', overflow: 'hidden',
      animationDelay: card.d,
      boxShadow: hov ? `0 10px 0 rgba(0,0,0,0.4),0 0 50px ${card.glow}` : `0 6px 0 rgba(0,0,0,0.5),0 0 20px ${card.glow.replace('0.5)','0.15)')}`,
      border: `3px solid ${hov ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
      transform: hov ? 'translateY(-6px) scale(1.02)' : 'none',
      transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      borderRadius: kidsMode ? 20 : undefined,
    }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ position:'absolute',inset:0,pointerEvents:'none',backgroundImage:`radial-gradient(circle,rgba(255,255,255,0.08) 1.5px,transparent 1.5px)`,backgroundSize:'12px 12px',opacity:hov?1:0.5,transition:'opacity 0.2s' }}/>
      <span style={{ fontSize: kidsMode ? 56 : 48, position:'relative',zIndex:1,display:'block' }}>{card.emoji}</span>
      <span style={{ fontSize: kidsMode?18:16,fontWeight:800,color:'#fff',textShadow:'0 2px 8px rgba(0,0,0,0.5)',position:'relative',zIndex:1,textAlign:'center' }}>{label}</span>
      <span style={{ fontSize: kidsMode?13:11,color:'rgba(255,255,255,0.75)',textAlign:'center',lineHeight:1.3,position:'relative',zIndex:1 }}>{sub}</span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// My Stories Gallery
// ─────────────────────────────────────────────────────────────────────────────

function MyStoriesGallery({ kidsMode, anxiety, bilingual, isEs, userName }: {
  kidsMode: boolean; anxiety: boolean; bilingual: boolean; isEs: boolean; userName: string | null;
}) {
  const t = useTranslations('dashboard');
  const [stories, setStories] = useState<BondStory[]>([]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const reload = () => setStories(loadBondStories());
  useEffect(() => { reload(); }, []);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const story = parseBondFile(ev.target?.result as string);
      if (!story) {
        setMsg({ text: anxiety ? CALM_MESSAGES.fileError[isEs?'es':'en'] : '❌ Invalid file', ok: false });
      } else {
        autoSaveBondStory(story); reload();
        setMsg({ text: CALM_MESSAGES.fileOk[isEs?'es':'en'], ok: true });
      }
      setTimeout(() => setMsg(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const noStoriesMsg = anxiety
    ? (bilingual
        ? <><span>{CALM_MESSAGES.noStories.en}</span><span style={{display:'block',fontSize:'0.85em',opacity:0.55,marginTop:3}}>{CALM_MESSAGES.noStories.es}</span></>
        : bi(CALM_MESSAGES.noStories.en, CALM_MESSAGES.noStories.es, false, isEs))
    : t('noStories');

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10 }}>
        <h2 style={{ fontSize: kidsMode?20:18, fontWeight:800, color:'#fff', margin:0 }}>
          📖 {t('myStories')}
          {userName && stories.length > 0 && (
            <span style={{ fontSize:12, fontWeight:500, color:'rgba(255,255,255,0.35)', marginLeft:10 }}>
              {stories.length} {bilingual ? 'stories / historias' : isEs ? 'historias' : 'stories'}
            </span>
          )}
        </h2>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          <label style={{
            fontSize:kidsMode?13:11, color:'#06b6d4', cursor:'pointer',
            padding:kidsMode?'8px 16px':'5px 12px',
            border:'1px solid rgba(6,182,212,0.35)', borderRadius:8, fontWeight:600,
            background:'rgba(6,182,212,0.06)', display:'flex',alignItems:'center',gap:4,
            transition:'all 0.15s',
          }}>
            {t('loadBond')}
            <input type="file" accept=".bond,.json" onChange={handleImportFile} style={{ display:'none' }} />
          </label>
          {stories.length > 0 && (
            <Link href="/story-engine" style={{
              fontSize:kidsMode?13:11, color:'#ec4899', textDecoration:'none',
              padding:kidsMode?'8px 16px':'5px 12px',
              border:'1px solid rgba(236,72,153,0.35)', borderRadius:8, fontWeight:600,
              background:'rgba(236,72,153,0.06)',
            }}>{t('newStory')}</Link>
          )}
        </div>
      </div>

      {msg && (
        <div style={{
          padding:'10px 16px', borderRadius:12, marginBottom:14,
          background: msg.ok ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.08)',
          border:`1px solid ${msg.ok ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.25)'}`,
          fontSize:kidsMode?14:13, color:msg.ok?'#4ade80':'#fde68a',
          lineHeight:1.5,
        }}>
          {msg.text}
        </div>
      )}

      {stories.length === 0 ? (
        <div style={{
          textAlign:'center', padding:kidsMode?'56px 24px':'44px 24px',
          background:'rgba(255,255,255,0.03)',
          border:'2px dashed rgba(255,255,255,0.12)', borderRadius:20,
        }}>
          <div style={{ fontSize:kidsMode?64:52, marginBottom:12 }}>🚀</div>
          <div style={{ fontSize:kidsMode?18:16, fontWeight:700, color:'#e2e8f0', marginBottom:6, lineHeight:1.4 }}>
            {noStoriesMsg}
          </div>
          {!anxiety && (
            <div style={{ fontSize:kidsMode?15:13, color:'#64748b', marginBottom:20 }}>{t('noStoriesHint')}</div>
          )}
          <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap', marginTop:20 }}>
            <Link href="/story-engine" style={{
              display:'inline-block', padding:kidsMode?'14px 28px':'12px 24px',
              background:'linear-gradient(135deg,#ec4899,#a855f7)',
              borderRadius:kidsMode?16:12, color:'#fff', fontWeight:700,
              fontSize:kidsMode?16:14, textDecoration:'none',
              boxShadow:'0 4px 20px rgba(236,72,153,0.3)',
            }}>
              {bilingual
                ? <><span>{t('createFirst')}</span><span style={{display:'block',fontSize:'0.8em',opacity:0.6}}>{t('createFirst')}</span></>
                : t('createFirst')}
            </Link>
            {!hasDemoStory() && (
              <button onClick={() => { seedDemoStory(); reload(); }} style={{
                padding:kidsMode?'14px 28px':'12px 24px',
                background:'rgba(6,182,212,0.12)', border:'1px solid rgba(6,182,212,0.35)',
                borderRadius:kidsMode?16:12, color:'#06b6d4',
                fontWeight:700, fontSize:kidsMode?16:14,
                cursor:'pointer', fontFamily:'inherit',
              }}>{t('viewExample')}</button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:kidsMode?16:14 }}>
          {stories.map((story, i) => (
            <StoryCard key={story.id} story={story} delay={`${i*0.05}s`} kidsMode={kidsMode} />
          ))}
        </div>
      )}
    </div>
  );
}

function StoryCard({ story, delay, kidsMode }: { story: BondStory; delay: string; kidsMode: boolean }) {
  const t = useTranslations('dashboard');
  const [hov, setHov] = useState(false);
  const date = new Date(story.updatedAt).toLocaleDateString('en-US', { day:'2-digit', month:'short' });
  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    import('@/lib/bondSave').then(({ saveBondFile }) => saveBondFile(story));
  };
  return (
    <div style={{ position:'relative' }}>
      <Link href={`/my-stories?id=${story.id}`} className="story-card" style={{
        textDecoration:'none', animationDelay:delay,
        transform:hov?'translateY(-4px)':'translateY(0)',
        boxShadow:hov?'0 8px 24px rgba(0,0,0,0.4)':'0 2px 8px rgba(0,0,0,0.2)',
        borderColor:hov?'rgba(236,72,153,0.4)':'rgba(255,255,255,0.1)',
        transition:'all 0.2s', display:'block',
        borderRadius:kidsMode?'20px':undefined,
      }}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        <div style={{ fontSize:kidsMode?52:44, textAlign:'center', marginBottom:10, background:'rgba(255,255,255,0.05)', borderRadius:12, padding:'12px 0' }}>
          {story.cover_emoji || '📖'}
        </div>
        <div style={{ fontSize:kidsMode?15:14, fontWeight:700, color:'#f1f5f9', marginBottom:4, lineHeight:1.3 }}>{story.title}</div>
        {story.genre && (
          <div style={{ fontSize:10, color:'#ec4899', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            {story.genre.replace(/_/g,' ')}
          </div>
        )}
        <div style={{ fontSize:10, color:'#475569', marginBottom:8 }}>📅 {date} · {story.chapters.length} ch.</div>
        <button onClick={handleSave} style={{
          width:'100%', padding:kidsMode?'8px 0':'6px 0',
          background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)',
          borderRadius:8, color:'#06b6d4', fontSize:kidsMode?12:10, fontWeight:700,
          cursor:'pointer', fontFamily:'inherit',
        }}>{t('saveBond')}</button>
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Tip
// ─────────────────────────────────────────────────────────────────────────────

function QuickTip({ kidsMode, bilingual, isEs }: { kidsMode: boolean; bilingual: boolean; isEs: boolean }) {
  const t = useTranslations('dashboard');
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(false);
  useEffect(() => { setIdx(Math.floor(Math.random() * TIPS.length)); }, []);
  const next = () => { setFade(true); setTimeout(() => { setIdx(i => (i+1)%TIPS.length); setFade(false); }, 200); };

  return (
    <div style={{
      padding:kidsMode?'20px 24px':'16px 20px',
      background:'rgba(251,191,36,0.06)',
      border:'1px solid rgba(251,191,36,0.2)',
      borderRadius:kidsMode?20:16,
      display:'flex', alignItems:'center', gap:14,
    }}>
      <span style={{ fontSize:kidsMode?36:28, flexShrink:0 }}>🌟</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:kidsMode?12:10, color:'#fbbf24', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>
          {t('tip')}
        </div>
        <div style={{ fontSize:kidsMode?15:13, color:'#fde68a', lineHeight:1.5, opacity:fade?0:1, transition:'opacity 0.2s' }}>
          {bilingual || !isEs ? TIPS[idx].en : TIPS[idx].es}
          {bilingual && <div style={{ marginTop:3, fontSize:'0.88em', opacity:0.5 }}>{TIPS[idx].es}</div>}
        </div>
      </div>
      <button onClick={next} style={{
        background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.3)',
        borderRadius:8, color:'#fbbf24', fontSize:kidsMode?13:11, fontWeight:600,
        padding:kidsMode?'8px 14px':'6px 12px', cursor:'pointer', fontFamily:'inherit', flexShrink:0,
        transition:'all 0.15s',
      }}
        onMouseEnter={e=>(e.currentTarget.style.background='rgba(251,191,36,0.25)')}
        onMouseLeave={e=>(e.currentTarget.style.background='rgba(251,191,36,0.15)')}
      >{t('tipNext')}</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { kidsMode }                           = useKidsMode();
  const { name, emoji, color, anxiety, lang, hasProfile } = useUserProfile();

  const bilingual = lang === 'bilingual';
  const isEs      = lang === 'es';

  return (
    <main className={kidsMode ? 'kids-mode' : ''} style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#070510 0%,#0d0618 40%,#0a1020 100%)',
      color: '#e2e8f0',
      fontFamily: kidsMode
        ? "'Segoe UI',system-ui,-apple-system,sans-serif"
        : 'system-ui,-apple-system,sans-serif',
      overflowX: 'hidden',
    }}>
      {/* Ambient blobs — calmer/slower for anxiety users */}
      <div aria-hidden style={{ position:'fixed',inset:0,pointerEvents:'none',zIndex:0 }}>
        <div style={{
          position:'absolute',width:600,height:600,top:'-10%',left:'10%',
          borderRadius:'50%',
          background:`radial-gradient(circle,${anxiety?'rgba(34,211,238,0.08)':'rgba(236,72,153,0.12)'} 0%,transparent 65%)`,
          filter:'blur(100px)',
          animation:`bond-float ${anxiety?'14':'9'}s ease-in-out infinite`,
        }}/>
        <div style={{
          position:'absolute',width:500,height:500,bottom:'5%',right:'8%',
          borderRadius:'50%',
          background:'radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 65%)',
          filter:'blur(90px)',
          animation:`bond-float ${anxiety?'18':'13'}s ease-in-out 3s infinite`,
        }}/>
      </div>

      <style>{`
        @keyframes bond-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes bond-gentle-bob{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-5px) scale(1.02)}}
      `}</style>

      <div style={{ position:'relative',zIndex:1,maxWidth:1100,margin:'0 auto',padding:'28px 20px' }}>

        {/* Welcome banner — personalized if profile exists */}
        {hasProfile && name ? (
          <WelcomeBanner
            name={name} emoji={emoji} color={color}
            anxiety={anxiety} bilingual={bilingual} isEs={isEs}
          />
        ) : (
          <HeroBanner kidsMode={kidsMode} />
        )}

        {/* Actions — one-at-a-time layout for anxiety users */}
        {anxiety ? (
          <AnxietyActionLayout color={color} bilingual={bilingual} isEs={isEs} />
        ) : (
          <ActionGrid kidsMode={kidsMode} />
        )}

        <MyStoriesGallery
          kidsMode={kidsMode} anxiety={anxiety}
          bilingual={bilingual} isEs={isEs} userName={name}
        />
        <QuickTip kidsMode={kidsMode} bilingual={bilingual} isEs={isEs} />

        {/* Footer */}
        <div style={{ marginTop:40,paddingTop:16,borderTop:'1px solid rgba(255,255,255,0.06)',textAlign:'center' }}>
          <span style={{ fontSize:10,color:'rgba(255,255,255,0.2)',letterSpacing:'0.2em',textTransform:'uppercase',fontFamily:'ui-monospace,monospace' }}>
            BOND Studios · ConvergeVerse Studio · v0.5.0
          </span>
        </div>
      </div>
    </main>
  );
}
