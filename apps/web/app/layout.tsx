// Force dynamic rendering globally — root layout uses next-intl getLocale() which reads request headers
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { Bangers, Cinzel, Inter, JetBrains_Mono, Uncial_Antiqua } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { StudioShell } from '@/components/StudioShell';
import './globals.css';
import BondOnboardingModal from '@/components/onboarding/BondOnboardingModal';
import { BondCentralGuard } from '@/components/BondCentralGuard';

/** Cuerpo UI — legibilidad tipo Apple (SF-like) */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

/** Títulos épicos / novela / marca — fantasía clásica + calidad editorial */
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});

/** Acento medieval en carátulas y rótulos “manuscrito” */
const uncialAntiqua = Uncial_Antiqua({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-uncial',
  display: 'swap',
});

/** Globos y diálogos manga — energía comic / Konosuba */
const bangers = Bangers({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bangers',
  display: 'swap',
});

/** HUD, datos técnicos, inputs — consola / Orbet */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ConvergeVerse Studio — BOND Studios',
    template: '%s · ConvergeVerse',
  },
  description: 'Plataforma profesional de creación anime autónoma. Story Engine, Manga Studio, Series Platform y más — BOND Studios.',
  keywords: ['anime', 'manga', 'story engine', 'BOND Studios', 'ConvergeVerse', 'narrative AI', 'creative platform'],
  authors: [{ name: 'BOND Studios' }],
  creator: 'BOND Studios',
  openGraph: {
    type: 'website',
    title: 'ConvergeVerse Studio — BOND Studios',
    description: 'Plataforma profesional de creación anime — desde la historia hasta el manga publicado',
    siteName: 'ConvergeVerse Studio',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`dark ${inter.variable} ${cinzel.variable} ${uncialAntiqua.variable} ${bangers.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <BondCentralGuard>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <StudioShell>{children}</StudioShell>
            <BondOnboardingModal />
          </NextIntlClientProvider>
        </BondCentralGuard>
      </body>
    </html>
  );
}
