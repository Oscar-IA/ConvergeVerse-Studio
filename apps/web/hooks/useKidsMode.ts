'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'convergeverse_kids_mode';

export function useKidsMode() {
  const [kidsMode, setKidsMode] = useState(false);

  // Read from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'true') setKidsMode(true);
    } catch {
      // localStorage unavailable (SSR / private mode)
    }
  }, []);

  const toggle = () => {
    setKidsMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return { kidsMode, toggle };
}
