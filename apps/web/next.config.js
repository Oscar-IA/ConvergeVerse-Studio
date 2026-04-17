const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Monorepo (npm workspaces): ancla trazas al root del repo.
   * Evita desajustes de chunks tipo "Cannot find module './974.js'" tras builds parciales.
   */
  outputFileTracingRoot: path.join(__dirname, '../..'),

  // Diccionarios Hunspell (ESM + top-level await) y nspell: no empaquetar con Webpack en la ruta /api/spellcheck
  experimental: {
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
