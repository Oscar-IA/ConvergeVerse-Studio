'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'bond_onboarded_convergeverse_v1';

type StepType = 'hero' | 'feature' | 'ai-portal' | 'action' | 'complete';

interface Step {
  type: StepType;
  icon?: string;
  gradient?: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  buttonLabel?: string;
}

const STEPS: Step[] = [
  {
    type: 'hero',
    icon: '🌌',
    gradient: 'from-indigo-500 to-purple-600',
    badge: 'Welcome',
    title: 'Welcome to ConvergeVerse Studio',
    subtitle: 'Where stories become worlds',
    description:
      'ConvergeVerse is the AI-powered narrative engine that turns your ideas into fully realized fictional universes. Characters, worlds, storylines and visuals — all generated from your imagination.',
  },
  {
    type: 'feature',
    badge: 'Feature',
    title: 'The Story Engine',
    subtitle: 'Your universe, fully structured',
    description:
      'ConvergeVerse organizes your narrative into four pillars: World (setting), Characters (personalities), Story (arcs & events) and Visuals (AI-generated imagery). Everything connects.',
  },
  {
    type: 'feature',
    badge: 'Feature',
    title: 'Create Your World',
    subtitle: 'Start with the setting',
    description:
      'Define the rules of your universe — its geography, history, magic systems or technology. The AI maintains continuity across every story element, ensuring nothing contradicts your world\'s rules.',
  },
  {
    type: 'ai-portal',
    badge: 'AI Portal',
    title: 'Your AI, Your Voice',
    subtitle: 'Connect your intelligence',
    description:
      'Add your API key in Settings → AI Portal. ConvergeVerse learns your narrative style — the tone, pacing and vocabulary you prefer — and applies it consistently across all generated content.',
  },
  {
    type: 'feature',
    badge: 'Feature',
    title: 'Characters & Relationships',
    subtitle: 'People make the story',
    description:
      'Build characters with deep profiles: motivations, backstory, speech patterns, relationships. The AI generates character-consistent dialogue and ensures personalities remain coherent across chapters.',
  },
  {
    type: 'action',
    badge: 'Get Started',
    title: 'Create Your First World',
    subtitle: 'The universe begins',
    description:
      'Give your world a name and a one-line description. The AI will expand it into a full setting document you can explore and refine.',
    buttonLabel: 'Create a World →',
  },
  {
    type: 'complete',
    badge: 'Ready',
    title: 'Your Universe Awaits',
    subtitle: 'ConvergeVerse is ready',
    description:
      'Your story engine is running. Start by building your world, then populate it with characters and begin writing. Every element becomes part of a living, connected narrative universe.',
    buttonLabel: 'Begin Creating →',
  },
];

export default function BondOnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — skip onboarding
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, next, dismiss]);

  if (!visible) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const hasButton = current.buttonLabel != null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-10 shadow-2xl">

        {/* Skip button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-white/40 hover:text-white/70 text-sm cursor-pointer bg-transparent border-0"
          aria-label="Skip onboarding"
        >
          Skip
        </button>

        {/* Hero orb (only on hero step) */}
        {current.type === 'hero' && current.icon && current.gradient && (
          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${current.gradient} mx-auto mb-4 flex items-center justify-center text-4xl`}
          >
            {current.icon}
          </div>
        )}

        {/* Type badge */}
        <p className="text-xs uppercase tracking-widest text-white/40 mb-3 font-medium">
          {current.badge}
        </p>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-2">{current.title}</h2>

        {/* Subtitle */}
        <p className="text-sm text-white/50 uppercase tracking-widest mb-6">
          {current.subtitle}
        </p>

        {/* Description */}
        <p className="text-white/75 leading-relaxed mb-8">{current.description}</p>

        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-8">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-colors border-0 p-0 cursor-pointer ${
                i === step ? 'bg-white' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {!isFirst && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-white/40 hover:text-white/70 text-sm cursor-pointer bg-transparent border-0"
            >
              ← Back
            </button>
          )}
          <div className="flex-1" />
          {hasButton ? (
            <button onClick={dismiss} className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition cursor-pointer border-0">
              {current.buttonLabel}
            </button>
          ) : (
            <button onClick={next} className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition cursor-pointer border-0">
              {isLast ? 'Get Started' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
