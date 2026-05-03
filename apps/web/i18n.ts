import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

const SUPPORTED_LOCALES = ['en', 'es', 'fr'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

/**
 * next-intl configuration — cookie-based locale, no URL prefix routing.
 *
 * We do NOT use next-intl's built-in URL routing ([locale] segments).
 * The middleware (proxy.ts) resolves the locale and injects it via the
 * `x-bond-locale` request header.  We read that header here so
 * getLocale() / getMessages() work correctly in server components.
 */
export default getRequestConfig(async () => {
  const headersList = headers();
  const raw = headersList.get('x-bond-locale');
  const locale: SupportedLocale = isSupportedLocale(raw) ? raw : 'en';

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
