'use client';

/**
 * useUserProfile — reads the user's profile from cookies set by /api/auth/direct.
 *
 * Falls back gracefully to anonymous defaults so every component can use this
 * hook without worrying about null checks.
 */

import { useEffect, useState } from 'react';
import { PROFILE_COOKIES, type UserMode, type SupportedLang } from '@/lib/userProfiles';

export interface ActiveProfile {
  /** Display name, or null if anonymous */
  name:    string | null;
  /** Personal emoji */
  emoji:   string;
  /** Accent color (CSS hex) */
  color:   string;
  /** UI mode */
  mode:    UserMode;
  /** Preferred language */
  lang:    SupportedLang;
  /** Anxiety-safe UX is active */
  anxiety: boolean;
  /** Whether a profile was found (false = anonymous user) */
  hasProfile: boolean;
}

const DEFAULTS: ActiveProfile = {
  name:       null,
  emoji:      '🌟',
  color:      '#ec4899',
  mode:       'adult',
  lang:       'en',
  anxiety:    false,
  hasProfile: false,
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie.split(';').find(c => c.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.split('=').slice(1).join('=')).trim() : null;
}

export function useUserProfile(): ActiveProfile {
  const [profile, setProfile] = useState<ActiveProfile>(DEFAULTS);

  useEffect(() => {
    const name    = readCookie(PROFILE_COOKIES.name);
    const mode    = readCookie(PROFILE_COOKIES.mode)    as UserMode    | null;
    const anxiety = readCookie(PROFILE_COOKIES.anxiety);
    const lang    = readCookie(PROFILE_COOKIES.lang)    as SupportedLang | null;
    const emoji   = readCookie(PROFILE_COOKIES.emoji);
    const color   = readCookie(PROFILE_COOKIES.color);

    if (!name) return; // no profile cookie → stay as defaults

    setProfile({
      name,
      emoji:      emoji   ?? DEFAULTS.emoji,
      color:      color ? `#${color}` : DEFAULTS.color,
      mode:       mode    ?? DEFAULTS.mode,
      lang:       lang    ?? DEFAULTS.lang,
      anxiety:    anxiety === '1',
      hasProfile: true,
    });
  }, []);

  return profile;
}
