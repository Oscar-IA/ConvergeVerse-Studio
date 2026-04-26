/**
 * BOND Central — satellite session utilities for ConvergeVerse Studio.
 */
export const SATELLITE_SESSION_COOKIE = "bond_satellite_session";
export const SATELLITE_TTL_SECONDS = 60 * 60;

export function getCentralUrl(): string {
  return process.env.NEXT_PUBLIC_BOND_CENTRAL_URL ?? "https://bond-central.vercel.app";
}

export async function verifySatelliteToken(
  token: string,
  centralUrl: string,
): Promise<{ nodeId: string; appId: string } | null> {
  try {
    const url = new URL("/api/auth/satellite-token", centralUrl);
    url.searchParams.set("token", token);
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { valid?: boolean; nodeId?: string; appId?: string };
    if (!data.valid || !data.nodeId) return null;
    return { nodeId: data.nodeId, appId: data.appId ?? "bond-convergeverse" };
  } catch {
    return null;
  }
}

export function satelliteCookieOptions(maxAge = SATELLITE_TTL_SECONDS) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
