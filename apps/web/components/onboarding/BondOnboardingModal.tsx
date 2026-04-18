'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'bond_onboarded_convergeverse_v1';

interface Step {
  id: string;
  badge: string;
  title: string;
  body: string;
  svg: React.ReactNode;
  buttonLabel?: string;
}

// ── Animated SVGs ────────────────────────────────────────────────────────────

const StarUniverseSVG = () => (
  <svg width="160" height="100" viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Stars / particles */}
    {[[20,18],[140,22],[10,70],[150,68],[80,8],[30,50],[130,50],[80,92],[55,30],[105,30],[55,70],[105,70]].map(([cx,cy], i) => (
      <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 2.5 : 1.5}
        fill={i % 2 === 0 ? '#ec4899' : '#8b5cf6'}
        className={`cv-star-${i % 4}`} opacity="0.7"/>
    ))}
    {/* Central orb */}
    <circle cx="80" cy="50" r="20" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5" className="cv-orb-ring"/>
    <circle cx="80" cy="50" r="12" fill="rgba(236,72,153,0.15)" stroke="rgba(236,72,153,0.5)" strokeWidth="1.5"/>
    <circle cx="80" cy="50" r="5" fill="rgba(236,72,153,0.3)" stroke="#ec4899" strokeWidth="1.5" className="cv-orb-core"/>
    {/* Orbit ring */}
    <ellipse cx="80" cy="50" rx="34" ry="12" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="1" strokeDasharray="5,3" className="cv-orbit"/>
    <circle cx="114" cy="50" r="3.5" fill="rgba(236,72,153,0.4)" stroke="#ec4899" strokeWidth="1" className="cv-orbit-dot"/>
  </svg>
)

const BranchingTreeSVG = () => (
  <svg width="160" height="100" viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Root */}
    <circle cx="80" cy="82" r="8" fill="rgba(236,72,153,0.2)" stroke="#ec4899" strokeWidth="1.5"/>
    <text x="80" y="86" textAnchor="middle" fill="#ec4899" fontSize="8" fontWeight="700">S</text>
    {/* Branches up */}
    <line x1="80" y1="74" x2="50" y2="56" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" className="cv-branch-1"/>
    <line x1="80" y1="74" x2="110" y2="56" stroke="rgba(236,72,153,0.5)" strokeWidth="1.5" className="cv-branch-2"/>
    <circle cx="50" cy="50" r="7" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" className="cv-node-1"/>
    <circle cx="110" cy="50" r="7" fill="rgba(236,72,153,0.15)" stroke="rgba(236,72,153,0.5)" strokeWidth="1.5" className="cv-node-2"/>
    {/* Second level */}
    <line x1="50" y1="43" x2="28" y2="28" stroke="rgba(139,92,246,0.4)" strokeWidth="1" strokeDasharray="3,2" className="cv-branch-3"/>
    <line x1="50" y1="43" x2="60" y2="28" stroke="rgba(139,92,246,0.4)" strokeWidth="1" strokeDasharray="3,2" className="cv-branch-3"/>
    <line x1="110" y1="43" x2="100" y2="28" stroke="rgba(236,72,153,0.4)" strokeWidth="1" strokeDasharray="3,2" className="cv-branch-4"/>
    <line x1="110" y1="43" x2="132" y2="28" stroke="rgba(236,72,153,0.4)" strokeWidth="1" strokeDasharray="3,2" className="cv-branch-4"/>
    <circle cx="28" cy="22" r="5" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.4)" strokeWidth="1"/>
    <circle cx="60" cy="22" r="5" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="1.5" className="cv-node-1"/>
    <circle cx="100" cy="22" r="5" fill="rgba(236,72,153,0.1)" stroke="rgba(236,72,153,0.3)" strokeWidth="1"/>
    <circle cx="132" cy="22" r="5" fill="rgba(236,72,153,0.2)" stroke="#ec4899" strokeWidth="1.5" className="cv-node-2"/>
    <text x="60" y="26" textAnchor="middle" fill="#8b5cf6" fontSize="7">A</text>
    <text x="132" y="26" textAnchor="middle" fill="#ec4899" fontSize="7">B</text>
  </svg>
)

const WorldMapSVG = () => (
  <svg width="160" height="100" viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* World border */}
    <rect x="10" y="10" width="140" height="80" rx="8" fill="rgba(139,92,246,0.06)" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5"/>
    {/* Continent blobs */}
    <ellipse cx="46" cy="38" rx="22" ry="14" fill="rgba(236,72,153,0.12)" stroke="rgba(236,72,153,0.4)" strokeWidth="1"/>
    <ellipse cx="90" cy="42" rx="28" ry="18" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.35)" strokeWidth="1"/>
    <ellipse cx="130" cy="56" rx="16" ry="12" fill="rgba(236,72,153,0.08)" stroke="rgba(236,72,153,0.3)" strokeWidth="1"/>
    <ellipse cx="48" cy="65" rx="14" ry="8" fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.3)" strokeWidth="1"/>
    {/* Location pins */}
    <circle cx="46" cy="38" r="3" fill="rgba(236,72,153,0.4)" stroke="#ec4899" strokeWidth="1" className="cv-pin-1"/>
    <circle cx="90" cy="42" r="3" fill="rgba(139,92,246,0.4)" stroke="#8b5cf6" strokeWidth="1" className="cv-pin-2"/>
    <circle cx="130" cy="56" r="3" fill="rgba(236,72,153,0.4)" stroke="#ec4899" strokeWidth="1" className="cv-pin-1"/>
    {/* Connection line */}
    <path d="M46 38 Q68 20 90 42" stroke="rgba(139,92,246,0.4)" strokeWidth="1" fill="none" strokeDasharray="4,2" className="cv-map-route"/>
    <path d="M90 42 Q110 30 130 56" stroke="rgba(236,72,153,0.4)" strokeWidth="1" fill="none" strokeDasharray="4,2" className="cv-map-route"/>
  </svg>
)

const CharacterNodesSVG = () => (
  <svg width="160" height="100" viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Central character */}
    <circle cx="80" cy="50" r="14" fill="rgba(236,72,153,0.15)" stroke="#ec4899" strokeWidth="1.5" className="cv-char-main"/>
    <text x="80" y="54" textAnchor="middle" fill="#ec4899" fontSize="9" fontWeight="700">HERO</text>
    {/* Surrounding characters */}
    {[[28,22],[132,22],[20,72],[140,72],[80,10]].map(([cx, cy], i) => (
      <g key={i}>
        <circle cx={cx} cy={cy} r="9" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.4)" strokeWidth="1" className={`cv-char-${i % 3}`}/>
        <line
          x1={cx > 80 ? cx - 9 : cx + 9}
          y1={cy > 50 ? cy - 3 : cy + 3}
          x2={cx > 80 ? 94 : 66}
          y2={cy > 50 ? 58 : 42}
          stroke="rgba(139,92,246,0.2)" strokeWidth="1" strokeDasharray="3,2"/>
      </g>
    ))}
    {/* Relationship strength indicators */}
    <path d="M80 36 Q54 32 37 31" stroke="rgba(236,72,153,0.3)" strokeWidth="1.5" fill="none" className="cv-rel-arc"/>
    <path d="M80 36 Q106 32 123 31" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5" fill="none" className="cv-rel-arc"/>
  </svg>
)

const ExportDeploySVG = () => (
  <svg width="160" height="100" viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Central studio */}
    <rect x="52" y="32" width="56" height="36" rx="8" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5"/>
    <text x="80" y="52" textAnchor="middle" fill="#8b5cf6" fontSize="8" fontWeight="700">STUDIO</text>
    {/* Export targets */}
    <rect x="4" y="10" width="36" height="20" rx="5" fill="rgba(236,72,153,0.1)" stroke="rgba(236,72,153,0.4)" strokeWidth="1"/>
    <text x="22" y="23" textAnchor="middle" fill="rgba(236,72,153,0.7)" fontSize="7">GAME</text>
    <rect x="120" y="10" width="36" height="20" rx="5" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.4)" strokeWidth="1"/>
    <text x="138" y="23" textAnchor="middle" fill="rgba(139,92,246,0.7)" fontSize="7">WEB</text>
    <rect x="4" y="70" width="36" height="20" rx="5" fill="rgba(236,72,153,0.1)" stroke="rgba(236,72,153,0.4)" strokeWidth="1"/>
    <text x="22" y="83" textAnchor="middle" fill="rgba(236,72,153,0.7)" fontSize="7">PRINT</text>
    <rect x="120" y="70" width="36" height="20" rx="5" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.4)" strokeWidth="1"/>
    <text x="138" y="83" textAnchor="middle" fill="rgba(139,92,246,0.7)" fontSize="7">APP</text>
    {/* Lines */}
    <line x1="52" y1="42" x2="40" y2="25" stroke="rgba(236,72,153,0.4)" strokeWidth="1" strokeDasharray="3,2" className="cv-export-line"/>
    <line x1="108" y1="42" x2="120" y2="25" stroke="rgba(139,92,246,0.4)" strokeWidth="1" strokeDasharray="3,2" className="cv-export-line"/>
    <line x1="52" y1="58" x2="40" y2="75" stroke="rgba(236,72,153,0.4)" strokeWidth="1" strokeDasharray="3,2" className="cv-export-line"/>
    <line x1="108" y1="58" x2="120" y2="75" stroke="rgba(139,92,246,0.4)" strokeWidth="1" strokeDasharray="3,2" className="cv-export-line"/>
  </svg>
)

const ConvergeReadySVG = () => (
  <svg width="160" height="100" viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="50" r="38" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="1" className="cv-ready-outer"/>
    <circle cx="80" cy="50" r="28" fill="rgba(236,72,153,0.06)" stroke="rgba(236,72,153,0.3)" strokeWidth="1.5" strokeDasharray="6,3" className="cv-ready-ring"/>
    <circle cx="80" cy="50" r="16" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5"/>
    <path d="M72 50 L78 56 L90 44" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="cv-checkmark"/>
    {[[116,18],[44,82],[20,32],[140,68]].map(([cx,cy], i) => (
      <circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 3 : 2}
        fill={i % 2 === 0 ? 'rgba(236,72,153,0.3)' : 'rgba(139,92,246,0.3)'}
        stroke={i % 2 === 0 ? '#ec4899' : '#8b5cf6'}
        strokeWidth="1"
        className={`cv-star-${i}`}/>
    ))}
  </svg>
)

// ── Step definitions ─────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 'welcome',
    badge: 'Welcome to ConvergeVerse Studio',
    title: 'Where Worlds Come Alive',
    body: 'ConvergeVerse Studio is the professional narrative and world-building platform for creators who build interactive universes. From story to system — all in one studio.',
    svg: <StarUniverseSVG />,
  },
  {
    id: 'narrative',
    badge: 'Narrative Editor',
    title: 'Branch Stories with Infinite Depth',
    body: 'Design branching dialogue trees, story arcs, and narrative graphs with a visual editor built for complexity. Every choice creates a new path.',
    svg: <BranchingTreeSVG />,
  },
  {
    id: 'world',
    badge: 'World Building',
    title: 'Build the World Behind the Story',
    body: 'Define lore, locations, characters, and rules. The world canvas keeps every element connected — so your universe stays consistent as it grows.',
    svg: <WorldMapSVG />,
  },
  {
    id: 'characters',
    badge: 'Multi-Character Arcs',
    title: 'Every Character Has a Journey',
    body: 'Track character development, relationship graphs, and arc progression across your entire timeline. Stories with depth, managed with precision.',
    svg: <CharacterNodesSVG />,
  },
  {
    id: 'export',
    badge: 'Export & Deploy',
    title: 'Bring Your World to Any Platform',
    body: 'Export your narrative systems to game engines, interactive platforms, and publishing tools. ConvergeVerse builds the story — you choose where it lives.',
    svg: <ExportDeploySVG />,
  },
  {
    id: 'ready',
    badge: 'You\'re All Set',
    title: 'Your Universe Awaits',
    body: 'Start a new project or open your world canvas.',
    svg: <ConvergeReadySVG />,
    buttonLabel: 'Enter the Studio',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function BondOnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [prevStep, setPrevStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable — skip onboarding
    }
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
      setVisible(false);
      setExiting(false);
    }, 220);
  }, []);

  const goTo = useCallback((i: number) => {
    setPrevStep(step);
    setStep(i);
    setAnimKey(k => k + 1);
  }, [step]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) goTo(step + 1);
    else dismiss();
  }, [step, goTo, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) goTo(step - 1);
  }, [step, goTo]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, next, prev, dismiss]);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const direction = step >= prevStep ? 1 : -1;

  return (
    <>
      <style>{`
        @keyframes cvModalIn {
          from { opacity: 0; transform: scale(0.94) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cvGradientBar {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes cvStepIn {
          from { opacity: 0; transform: translateX(${direction * 32}px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes cvStar0 {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          25%      { transform: scale(1.8); opacity: 1; }
        }
        @keyframes cvStar1 {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50%      { transform: scale(1.6); opacity: 1; }
        }
        @keyframes cvStar2 {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          75%      { transform: scale(1.7); opacity: 1; }
        }
        @keyframes cvStar3 {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          40%      { transform: scale(1.5); opacity: 1; }
        }
        @keyframes cvOrbRing {
          from { transform: rotate(0deg); transform-origin: 80px 50px; }
          to   { transform: rotate(360deg); transform-origin: 80px 50px; }
        }
        @keyframes cvOrbCore {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.3); }
        }
        @keyframes cvOrbit {
          from { transform: rotate(0deg); transform-origin: 80px 50px; }
          to   { transform: rotate(360deg); transform-origin: 80px 50px; }
        }
        @keyframes cvOrbitDot {
          from { transform: rotate(0deg) translateX(34px); transform-origin: 80px 50px; }
          to   { transform: rotate(360deg) translateX(34px); transform-origin: 80px 50px; }
        }
        @keyframes cvBranch1 {
          from { stroke-dashoffset: 40; opacity: 0; }
          to   { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes cvBranch2 {
          from { stroke-dashoffset: 40; opacity: 0; }
          to   { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes cvBranch3 {
          from { stroke-dashoffset: 30; opacity: 0; }
          to   { stroke-dashoffset: 0; opacity: 0.7; }
        }
        @keyframes cvBranch4 {
          from { stroke-dashoffset: 30; opacity: 0; }
          to   { stroke-dashoffset: 0; opacity: 0.7; }
        }
        @keyframes cvNodePop {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.2); }
        }
        @keyframes cvPinPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%      { transform: scale(1.6); opacity: 1; }
        }
        @keyframes cvMapRoute {
          from { stroke-dashoffset: 30; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes cvCharMain {
          0%, 100% { box-shadow: none; }
          50%      { filter: drop-shadow(0 0 6px #ec4899); }
        }
        @keyframes cvRelArc {
          from { stroke-dashoffset: 60; opacity: 0; }
          to   { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes cvExportLine {
          from { stroke-dashoffset: 20; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes cvReadyRing {
          from { transform: rotate(0deg); transform-origin: 80px 50px; }
          to   { transform: rotate(360deg); transform-origin: 80px 50px; }
        }
        @keyframes cvReadyOuter {
          0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; }
        }
        @keyframes cvCheckmark {
          from { stroke-dashoffset: 40; opacity: 0; }
          to   { stroke-dashoffset: 0; opacity: 1; }
        }
        .cv-star-0   { animation: cvStar0 2.4s ease-in-out infinite; }
        .cv-star-1   { animation: cvStar1 2.8s ease-in-out infinite; }
        .cv-star-2   { animation: cvStar2 3.2s ease-in-out infinite; }
        .cv-star-3   { animation: cvStar3 2s ease-in-out infinite; }
        .cv-orb-ring { animation: cvOrbRing 8s linear infinite; }
        .cv-orb-core { animation: cvOrbCore 2s ease-in-out infinite; }
        .cv-orbit    { animation: cvOrbit 6s linear infinite; }
        .cv-branch-1 { stroke-dasharray: 40; animation: cvBranch1 0.4s ease-out 0.1s both; }
        .cv-branch-2 { stroke-dasharray: 40; animation: cvBranch2 0.4s ease-out 0.2s both; }
        .cv-branch-3 { stroke-dasharray: 30; animation: cvBranch3 0.4s ease-out 0.4s both; }
        .cv-branch-4 { stroke-dasharray: 30; animation: cvBranch4 0.4s ease-out 0.5s both; }
        .cv-node-0   { animation: cvNodePop 2s ease-in-out infinite 0s; }
        .cv-node-1   { animation: cvNodePop 2s ease-in-out infinite 0.35s; }
        .cv-node-2   { animation: cvNodePop 2s ease-in-out infinite 0.7s; }
        .cv-char-0   { animation: cvNodePop 2.5s ease-in-out infinite 0s; }
        .cv-char-1   { animation: cvNodePop 2.5s ease-in-out infinite 0.3s; }
        .cv-char-2   { animation: cvNodePop 2.5s ease-in-out infinite 0.6s; }
        .cv-char-main { animation: cvCharMain 2s ease-in-out infinite; }
        .cv-pin-1    { animation: cvPinPulse 2s ease-in-out infinite; }
        .cv-pin-2    { animation: cvPinPulse 2s ease-in-out infinite 0.5s; }
        .cv-map-route { animation: cvMapRoute 1.5s linear infinite; }
        .cv-rel-arc  { stroke-dasharray: 60; animation: cvRelArc 0.5s ease-out 0.2s both; }
        .cv-export-line { animation: cvExportLine 1.5s linear infinite; }
        .cv-ready-ring  { animation: cvReadyRing 10s linear infinite; }
        .cv-ready-outer { animation: cvReadyOuter 2.5s ease-in-out infinite; }
        .cv-checkmark {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: cvCheckmark 0.5s ease-out 0.3s forwards;
        }
        .cv-skip-btn:hover {
          color: rgba(255,255,255,0.75) !important;
          background: rgba(255,255,255,0.10) !important;
        }
        .cv-next-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .cv-next-btn:active { opacity: 1; transform: translateY(0); }
        .cv-back-btn:hover { color: rgba(255,255,255,0.65) !important; }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="ConvergeVerse Studio Onboarding"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          opacity: exiting ? 0 : 1,
          transition: exiting ? 'opacity 0.22s ease' : undefined,
        }}
      >
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          margin: '0 16px',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          boxShadow: '0 8px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'cvModalIn 0.38s cubic-bezier(0.22,1,0.36,1) forwards',
          transform: exiting ? 'translateY(16px) scale(0.97)' : undefined,
          opacity: exiting ? 0 : undefined,
          transition: exiting ? 'transform 0.22s ease, opacity 0.22s ease' : undefined,
        }}>

          {/* Animated gradient bar */}
          <div style={{
            height: 3,
            background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #c084fc, #ec4899)',
            backgroundSize: '200% 100%',
            animation: 'cvGradientBar 3s ease infinite',
            borderRadius: '20px 20px 0 0',
            flexShrink: 0,
          }} />

          {/* Skip */}
          <button
            className="cv-skip-btn"
            onClick={dismiss}
            aria-label="Skip onboarding"
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
              fontWeight: 500,
              padding: '5px 12px',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'color 0.15s, background 0.15s',
            }}
          >
            Skip
          </button>

          {/* Step content */}
          <div
            key={animKey}
            style={{
              flex: 1,
              padding: '40px 44px 32px',
              display: 'flex',
              flexDirection: 'column',
              animation: 'cvStepIn 0.28s cubic-bezier(0.22,1,0.36,1) forwards',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
              {current.svg}
            </div>

            <p style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: '#ec4899',
              margin: '0 0 10px 0',
            }}>
              {current.badge}
            </p>

            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              margin: '0 0 14px 0',
              letterSpacing: '-0.025em',
            }}>
              {current.title}
            </h2>

            <p style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.6)',
              margin: 0,
            }}>
              {current.body}
            </p>
          </div>

          {/* Footer */}
          <div style={{
            padding: '0 44px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => goTo(i)}
                    aria-label={`Go to step ${i + 1}`}
                    style={{
                      width: i === step ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      border: 'none',
                      background: i === step
                        ? 'linear-gradient(90deg, #ec4899, #8b5cf6)'
                        : i < step
                        ? 'rgba(236,72,153,0.4)'
                        : 'rgba(255,255,255,0.12)',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1), background 0.2s ease',
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.03em' }}>
                ← → navigate · Esc skip
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {step > 0 && (
                <button
                  className="cv-back-btn"
                  onClick={prev}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 14,
                    fontWeight: 500,
                    padding: '10px 18px',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                >
                  ← Back
                </button>
              )}
              <button
                className="cv-next-btn"
                onClick={next}
                style={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '10px 24px',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'opacity 0.15s, transform 0.1s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isLast ? (current.buttonLabel ?? 'Enter the Studio') : 'Next'}
                {!isLast && <span style={{ fontSize: 16 }}>›</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
