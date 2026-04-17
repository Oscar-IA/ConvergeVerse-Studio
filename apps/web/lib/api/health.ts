import { getApiBaseUrl } from '@/lib/config';
import type { HealthResponse } from '@/lib/api/types';

/** Lightweight fetch for header status — keep separate from `client.ts` to avoid chunk/HMR issues. */
export async function getApiHealth(): Promise<HealthResponse | null> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
