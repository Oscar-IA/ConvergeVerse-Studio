/**
 * API base URL resolver.
 *
 * Priority:
 *   1. NEXT_PUBLIC_API_URL env var  (explicit override — set this to http://localhost:8000
 *      in .env.local to use the local Python FastAPI during development)
 *   2. Empty string  → relative paths  → Next.js API routes at /api/story-engine/*
 *      (works on Vercel and any environment where the Python API is not running)
 */
export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  return raw.replace(/\/+$/, '');
}
