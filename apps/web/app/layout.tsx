import type { Metadata } from 'next';
import { Bangers, Cinzel, Inter, JetBrains_Mono, Uncial_Antiqua } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { StudioShell } from '@/components/StudioShell';
import dynamic from 'next/dynamic';
import './globals.css';

const BondOnboardingModal = dynamic(
  () => import('@/components/onboarding/BondOnboardingModal'),
  { ssr: false }
);

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
  title: 'ConvergeVerse Studio',
  description: 'Autonomous Anime Creator — Bond Converge Universe',
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
        <NextIntlClientProvider locale={locale} messages={messages}>
          <StudioShell>{children}</StudioShell>
          <BondOnboardingModal />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
