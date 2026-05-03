const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Monorepo: ancla trazas de archivos al root del repo para evitar desajustes de chunks.
   * En Next.js 14 esto va dentro de `experimental`.
   */
  experimental: {
    // Only needed locally in the monorepo — Vercel resolves paths correctly on its own.
    // Setting this on Vercel causes a doubled-path bug: /vercel/path0/vercel/path0/...
    ...(process.env.VERCEL ? {} : { outputFileTracingRoot: path.join(__dirname, '../..') }),
    serverComponentsExternalPackages: [
      'nspell',
      'dictionary-en-us',
      'dictionary-es',
      'dictionary-fr',
      'franc-min',
    ],
  },
  /** Reduce watchers (ayuda con EMFILE / "too many open files" en macOS con monorepo). */
  webpack: (config, { dev }) => {
    if (dev) {
      const pollMs = process.env.WEBPACK_POLL_MS;
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules/**', '**/.git/**'],
        aggregateTimeout: 300,
        ...(pollMs ? { poll: Number(pollMs) || 2000 } : {}),
      };
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
