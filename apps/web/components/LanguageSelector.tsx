'use client';

/**
 * LanguageSelector
 * Sets the `bond_lang` cookie and reloads the page so next-intl
 * picks up the new locale on the next server render.
 * No URL-prefix changes — locale is fully cookie-driven.
 */

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

const LOCALES = [
  { code: 'en', label: 'EN', name: 'English (Canada)', flag: '🇨🇦' },
  { code: 'es', label: 'ES', name: 'Español (Colombia)', flag: '🇨🇴' },
  { code: 'fr', label: 'FR', name: 'Français (France)', flag: '🇫🇷' },
] as const;

type LocaleCode = (typeof LOCALES)[number]['code'];

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(name + '='))
    ?.split('=')[1];
}

function setLocaleCookie(locale: LocaleCode) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `bond_lang=${locale}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function LanguageSelector() {
  const [current, setCurrent] = useState<LocaleCode>('en');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync initial value from cookie on mount
  useEffect(() => {
    const cookie = getCookie('bond_lang') as LocaleCode | undefined;
    if (cookie && LOCALES.some((l) => l.code === cookie)) {
      setCurrent(cookie);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectLocale(code: LocaleCode) {
    if (code === current) {
      setOpen(false);
      return;
    }
    setLocaleCookie(code);
    setCurrent(code);
    setOpen(false);
    // Full reload so server components re-render with new locale
    window.location.reload();
  }

  const currentLocale = LOCALES.find((l) => l.code === current)!;

  return (
    <div
      ref={ref}
      className="lang-selector"
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        className="lang-selector__trigger font-datum"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${currentLocale.name}`}
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '4px',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontFamily: 'inherit',
          letterSpacing: '0.08em',
          padding: '3px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span aria-hidden>{currentLocale.flag}</span>
        {currentLocale.label}
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Select language"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            background: 'rgba(10, 10, 20, 0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            listStyle: 'none',
            margin: 0,
            padding: '4px 0',
            minWidth: '120px',
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {LOCALES.map(({ code, label, name, flag }) => (
            <li key={code} role="option" aria-selected={code === current}>
              <button
                onClick={() => selectLocale(code)}
                style={{
                  background: code === current ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  letterSpacing: '0.06em',
                  padding: '6px 12px',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <span aria-hidden style={{ fontSize: '1rem' }}>{flag}</span>
                <span
                  style={{
                    fontWeight: 700,
                    opacity: code === current ? 1 : 0.55,
                    minWidth: '20px',
                  }}
                >
                  {label}
                </span>
                <span style={{ opacity: 0.75 }}>{name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
