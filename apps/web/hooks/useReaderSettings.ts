'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from '@/lib/config';

export type ReaderSettingsState = {
  fontSize: number;
  narrationEnabled: boolean;
};

const LS_PREFIX = 'convergeverse_reader_settings';

function storageKey(profileId: string) {
  return `${LS_PREFIX}_${profileId}`;
}

function loadLocal(profileId: string): ReaderSettingsState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(profileId));
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<ReaderSettingsState>;
    if (typeof j.fontSize === 'number' && typeof j.narrationEnabled === 'boolean') {
      return {
        fontSize: Math.min(32, Math.max(14, Math.round(j.fontSize))),
        narrationEnabled: j.narrationEnabled,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveLocal(profileId: string, s: ReaderSettingsState) {
  try {
    localStorage.setItem(storageKey(profileId), JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function defaultProfileId(explicit?: string): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_READER_PROFILE_ID : undefined;
  const raw = (explicit || fromEnv || 'default').trim();
  return raw || 'default';
}

/**
 * Ajustes del lector: carga desde Supabase (FastAPI + service_role), guarda con debounce.
 * Si `syncRemote` es false, solo `localStorage` (sin llamadas API).
 * Si la API falla, se usa y se escribe respaldo en localStorage.
 */
export function useReaderSettings(syncRemote: boolean, profileIdExplicit?: string) {
  const profileId = defaultProfileId(profileIdExplicit);

  const [settings, setSettings] = useState<ReaderSettingsState>({
    fontSize: 18,
    narrationEnabled: true,
  });
  const [loaded, setLoaded] = useState(false);
  /** True si el último guardado remoto fue OK (o lectura remota OK). */
  const [remoteOk, setRemoteOk] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchApi = useCallback(
    async (method: 'GET' | 'PUT', body?: object) => {
      const base = getApiBaseUrl();
      const url =
        method === 'GET'
          ? `${base}/api/story-engine/reader-settings?profile_id=${encodeURIComponent(profileId)}`
          : `${base}/api/story-engine/reader-settings`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const d = (err as { detail?: unknown }).detail;
        const msg =
          typeof d === 'string' ? d : Array.isArray(d) ? JSON.stringify(d) : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return res.json() as Promise<Record<string, unknown>>;
    },
    [profileId],
  );

  useEffect(() => {
    let cancelled = false;
    const loc = loadLocal(profileId);
    if (loc) {
      setSettings(loc);
    }

    if (!syncRemote) {
      setLoaded(true);
      setRemoteOk(false);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const row = await fetchApi('GET');
        if (cancelled) return;
        if (row && row.persisted) {
          const next: ReaderSettingsState = {
            fontSize: Math.min(32, Math.max(14, Number(row.font_size) || 18)),
            narrationEnabled: Boolean(row.narration_enabled),
          };
          setSettings(next);
          saveLocal(profileId, next);
        } else if (row && !loc) {
          const next: ReaderSettingsState = {
            fontSize: Math.min(32, Math.max(14, Number(row.font_size) || 18)),
            narrationEnabled: Boolean(row.narration_enabled),
          };
          setSettings(next);
        }
        setRemoteOk(Boolean(row && row.persisted));
      } catch {
        if (!cancelled) setRemoteOk(false);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [syncRemote, profileId, fetchApi]);

  const flushSave = useCallback(
    (next: ReaderSettingsState) => {
      saveLocal(profileId, next);
      if (!syncRemote) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void (async () => {
          try {
            const data = await fetchApi('PUT', {
              profile_id: profileId,
              font_size: next.fontSize,
              narration_enabled: next.narrationEnabled,
            });
            setRemoteOk(Boolean(data.persisted));
          } catch {
            setRemoteOk(false);
          }
        })();
      }, 450);
    },
    [syncRemote, profileId, fetchApi],
  );

  const setFontSize = useCallback(
    (n: number) => {
      const fontSize = Math.min(32, Math.max(14, Math.round(n)));
      setSettings((s) => {
        const next = { ...s, fontSize };
        flushSave(next);
        return next;
      });
    },
    [flushSave],
  );

  const setNarrationEnabled = useCallback(
    (narrationEnabled: boolean) => {
      setSettings((s) => {
        const next = { ...s, narrationEnabled };
        flushSave(next);
        return next;
      });
    },
    [flushSave],
  );

  return {
    settings,
    setFontSize,
    setNarrationEnabled,
    loaded,
    remoteOk,
    profileId,
  };
}
