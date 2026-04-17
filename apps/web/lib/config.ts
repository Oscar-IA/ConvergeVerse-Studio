/** Default Python FastAPI (must match uvicorn --port 8000). */
export const DEFAULT_API_BASE = 'http://localhost:8000';

/**
 * Python FastAPI base URL — port 8000, never the Next.js dev port (3000/3001).
 * Set NEXT_PUBLIC_API_URL in apps/web/.env.local if needed.
 */
export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE).trim();
  return raw.replace(/\/+$/, '');
}
