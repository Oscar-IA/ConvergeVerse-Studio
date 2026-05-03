'use client';

import { getApiHealth } from '@/lib/api/health';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useKidsMode } from '@/hooks/useKidsMode';

const navItems = [
  { href: '/',             key: 'home'      as const, icon: '⬡' },
  { href: '/story-engine', key: 'studio'    as const, icon: '✍️' },
  { href: '/my-stories',   key: 'myStories' as const, icon: '📖' },
  { href: '/series',       key: 'series'    as const, icon: '📚' },
  { href: '/templates',    key: 'templates' as const, icon: '🌸' },
  { href: '/creative-hub', key: 'settings'  as const, icon: '🔮' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const { kidsMode, toggle: toggleKidsMode } = useKidsMode();

  useEffect(() => {
    let cancelled = false;
    getApiHealth().then((h) => {
      if (!cancelled) setApiOk(h?.status === 'ok');
    });
    const timer = setInterval(() => {
      getApiHealth().then((h) => {
        if (!cancelled) setApiOk(h?.status === 'ok');
      });
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className={`app-shell${kidsMode ? ' kids-mode' : ''}`}>
      <header className="app-header surface" style={{
        background: 'rgba(5,2,12,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(236,72,153,0.12)',
        boxShadow: '0 1px 0 rgba(236,72,153,0.06), 0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Brand */}
        <div className="app-header__brand">
          <Link href="/" className="app-header__logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 900, letterSpacing: '0.06em',
              background: 'linear-gradient(135deg,#fff 0%,rgba(236,72,153,0.9) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              CONVERGEVERSE
            </span>
          </Link>
          <span className="app-header__tag font-datum" style={{
            fontSize: 8, letterSpacing: '0.3em', color: 'rgba(236,72,153,0.55)',
            textTransform: 'uppercase',
          }}>
            BOND Studios
          </span>
        </div>

        {/* Navigation */}
        <nav className="app-header__nav font-datum" aria-label="Main">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-header__link ${isActive ? 'app-header__link--active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, letterSpacing: '0.15em',
                  color: isActive ? '#ec4899' : 'rgba(255,255,255,0.45)',
                  textDecoration: 'none',
                  padding: '4px 8px', borderRadius: 2,
                  background: isActive ? 'rgba(236,72,153,0.07)' : 'transparent',
                  boxShadow: isActive ? 'inset 0 -2px 0 #ec4899' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 12 }}>{item.icon}</span>
                {t(item.key).toUpperCase()}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="app-header__actions font-datum" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={toggleKidsMode}
            className={`kids-mode-toggle${kidsMode ? ' kids-mode-toggle--active' : ''}`}
            title={kidsMode ? 'Cambiar a modo adulto' : 'Cambiar a modo niños'}
            aria-pressed={kidsMode}
            style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}
          >
            {kidsMode ? '🧒 NIÑOS' : '👨‍💻 ADULTOS'}
          </button>
          <LanguageSelector />

          <div
            className="app-header__status"
            title="Python API /health"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 9, letterSpacing: '0.15em',
              color: apiOk === true ? 'rgba(74,222,128,0.8)' : apiOk === false ? 'rgba(248,113,113,0.8)' : 'rgba(251,191,36,0.8)',
            }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: apiOk === true ? '#4ade80' : apiOk === false ? '#f87171' : '#fbbf24',
                boxShadow: `0 0 6px ${apiOk === true ? '#4ade80' : apiOk === false ? '#f87171' : '#fbbf24'}`,
                animation: apiOk === null ? 'bond-pulse-nav 1.2s ease-in-out infinite' : undefined,
              }}
            />
            <style>{`@keyframes bond-pulse-nav{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
            API {apiOk === null ? '…' : apiOk ? 'LIVE' : 'DOWN'}
          </div>
        </div>
      </header>

      <div className="app-main">{children}</div>
    </div>
  );
}
