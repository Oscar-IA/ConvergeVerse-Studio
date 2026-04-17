'use client';

import { getApiHealth } from '@/lib/api/health';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', key: 'home' as const },
  { href: '/story-engine', key: 'studio' as const },
  { href: '/manga', key: 'projects' as const },
  { href: '/creative-hub', key: 'settings' as const },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');

  useEffect(() => {
    let cancelled = false;
    getApiHealth().then((h) => {
      if (!cancelled) setApiOk(h?.status === 'ok');
    });
    const t = setInterval(() => {
      getApiHealth().then((h) => {
        if (!cancelled) setApiOk(h?.status === 'ok');
      });
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header surface">
        <div className="app-header__brand">
          <Link href="/story-engine" className="app-header__logo">
            CONVERGEVERSE
          </Link>
          <span className="app-header__tag font-datum">{t('studio')}</span>
        </div>

        <nav className="app-header__nav font-datum" aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`app-header__link ${pathname === item.href ? 'app-header__link--active' : ''}`}
            >
              {t(item.key).toUpperCase()}
            </Link>
          ))}
        </nav>

        <div className="app-header__actions font-datum" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LanguageSelector />

          <div className="app-header__status" title="Python API /health">
            <span
              className={`app-header__dot ${apiOk === true ? 'app-header__dot--ok' : apiOk === false ? 'app-header__dot--err' : 'app-header__dot--pending'}`}
              aria-hidden
            />
            API
            {apiOk === null && ` ${tCommon('loading').replace('...', ' …')}`}
            {apiOk === true && ' LIVE'}
            {apiOk === false && ' DOWN'}
          </div>
        </div>
      </header>

      <div className="app-main">{children}</div>
    </div>
  );
}
