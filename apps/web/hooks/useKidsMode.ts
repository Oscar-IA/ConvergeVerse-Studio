'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'convergeverse_kids_mode';
const COOKIE_KEY  = 'kids_mode';

/** Read a specific cookie by name (client-only) */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie.split(';').find(c => c.trim().startsWith(`${name}=`));
  return entry ? entry.split('=').slice(1).join('=').trim() : null;
}

export function useKidsMode() {
  const [kidsMode, setKidsModeState] = useState(false);

  /* On mount — check localStorage AND the kids_mode cookie (set by auth API for kid codes) */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const cookie = readCookie(COOKIE_KEY);
      if (stored === 'true' || cookie === '1') {
        setKidsModeState(true);
      }
    } catch {
      // localStorage / document.cookie unavailable
    }
  }, []);

  const persist = (value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  };

  /** Toggle kids mode */
  const toggle = () => {
    setKidsModeState(prev => {
      const next = !prev;
      persist(next);
      return next;
    });
  };

  /** Set kids mode to an explicit value */
  const set = (value: boolean) => {
    setKidsModeState(value);
    persist(value);
  };

  return { kidsMode, toggle, set };
}
