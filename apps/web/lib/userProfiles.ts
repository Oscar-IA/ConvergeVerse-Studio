/**
 * ConvergeVerse Studio — User Profile System
 *
 * Each access code maps to a UserProfile that drives the entire experience:
 * language, mode, personalization, and accessibility needs (e.g. anxiety).
 *
 * To add a new user: add one entry to CODE_PROFILES below.
 * No database required — profiles live here until a full auth system is built.
 */

export type SupportedLang = 'en' | 'es' | 'fr' | 'bilingual';
export type UserMode      = 'kids' | 'teen' | 'adult';
export type AgeGroup      = 'child' | 'teen' | 'adult';

export interface UserProfile {
  /** Display name shown in greetings  */
  name: string;
  /** Short nickname (used in tight spaces) */
  nickname?: string;
  /** Personal avatar emoji */
  emoji: string;
  /** Accent color (CSS hex, e.g. "#22d3ee") */
  color: string;
  /** UI mode — controls font sizes, border radii, card sizes */
  mode: UserMode;
  /** Age group — used for content filtering */
  ageGroup: AgeGroup;
  /** Preferred language. "bilingual" shows EN + ES labels simultaneously */
  language: SupportedLang;
  /** Accessibility / UX needs */
  needs: {
    /**
     * Anxiety mode — when true:
     * - ONE primary CTA at a time (not a wall of cards)
     * - Soft, calm colors (no harsh reds)
     * - Reassurance messages throughout
     * - Never leaves the user without a clear next step
     * - Positive-only feedback ("Let's try again!" vs "Error")
     */
    anxiety: boolean;
    /** Simplified UI — hide advanced features (series, templates, manga) */
    simplified?: boolean;
    /** Larger fonts beyond the standard kids boost */
    largeText?: boolean;
  };
  /** Greeting messages in EN and ES (picked randomly) */
  greetings: {
    en: string[];
    es: string[];
  };
  /** Shown below the name on the dashboard */
  tagline?: {
    en: string;
    es: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTERED USERS
// Add new users here. Key = access code (uppercase).
// ─────────────────────────────────────────────────────────────────────────────

export const CODE_PROFILES: Record<string, UserProfile> = {

  'BOND-GERO-2026': {
    name:     'Geronimo',
    nickname: 'Gero',
    emoji:    '🦸‍♂️',
    color:    '#22d3ee',          // calm cyan
    mode:     'kids',
    ageGroup: 'child',
    language: 'bilingual',
    needs: {
      anxiety:    true,
      simplified: false,
      largeText:  false,
    },
    greetings: {
      en: [
        "Hi Geronimo! Ready to create? 🌟",
        "Welcome back, Geronimo! Let's make something awesome! ✨",
        "Hey Geronimo! Your story is waiting for you! 📖",
        "Great to see you, Geronimo! Let's build a new world! 🌍",
      ],
      es: [
        "¡Hola Geronimo! ¿Listo para crear? 🌟",
        "¡Bienvenido de nuevo, Geronimo! ¡Hagamos algo increíble! ✨",
        "¡Oye Geronimo! ¡Tu historia te está esperando! 📖",
        "¡Qué bueno verte, Geronimo! ¡Construyamos un nuevo mundo! 🌍",
      ],
    },
    tagline: {
      en: "You're going to create something amazing today!",
      es: "¡Hoy vas a crear algo increíble!",
    },
  },

  // ── Template for new users ────────────────────────────────────────────────
  // 'BOND-XXXX-2026': {
  //   name:     'Name',
  //   emoji:    '🌟',
  //   color:    '#a855f7',
  //   mode:     'kids',
  //   ageGroup: 'child',
  //   language: 'en',
  //   needs:    { anxiety: false },
  //   greetings: { en: ["Hi Name!"], es: ["¡Hola Name!"] },
  // },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Look up a profile by access code. Returns null if the code has no profile. */
export function getProfileForCode(code: string): UserProfile | null {
  return CODE_PROFILES[code.trim().toUpperCase()] ?? null;
}

/** Pick a random greeting from the profile */
export function pickGreeting(profile: UserProfile, lang: 'en' | 'es' = 'en'): string {
  const list = profile.greetings[lang];
  return list[Math.floor(Math.random() * list.length)] ?? `Hi ${profile.name}!`;
}

/** Cookie name constants (client-readable, httpOnly: false) */
export const PROFILE_COOKIES = {
  name:    'cv_name',
  mode:    'cv_mode',
  anxiety: 'cv_anxiety',
  lang:    'cv_lang',
  emoji:   'cv_emoji',
  color:   'cv_color',
} as const;
