'use client';
/**
 * BondCentralGuard — client-side auth gate for ConvergeVerse Studio.
 *
 * Strategy (v2 — cookie-aware):
 *  1. On mount, call GET /api/auth/session — the server reads the httpOnly
 *     `bond_satellite_session` cookie and returns {authenticated: bool}.
 *  2. If URL carries ?token=xxx, redirect to /bond-auth/callback so the
 *     Next.js route handler sets the httpOnly cookie properly.
 *  3. Manual token entry triggers the same /bond-auth/callback redirect.
 *
 * This avoids the sessionStorage-vs-httpOnly-cookie mismatch that caused
 * the blank page after login.
 */
import React, { useEffect, useState } from "react";

const DEFAULT_CENTRAL = process.env.NEXT_PUBLIC_BOND_CENTRAL_URL ?? "https://bond-central.vercel.app";
const ACCENT = "rgba(236,72,153,";

const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9998,
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  background: "linear-gradient(135deg,rgba(5,2,8,0.97) 0%,rgba(10,5,20,0.97) 100%)",
  backdropFilter: "blur(8px)",
  padding: 24, color: "#fff",
  fontFamily: "ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace",
};

/** Check if the httpOnly cookie is present via our API bridge. */
async function checkServerSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * If the URL has ?token=xxx, redirect to /bond-auth/callback to set the
 * httpOnly cookie. Returns true if a redirect was initiated.
 */
function handleUrlTokenRedirect(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token")?.trim() ?? "";
  const central = params.get("central")?.trim() ?? "";
  if (!token) return false;

  const callbackUrl = new URL("/bond-auth/callback", window.location.origin);
  callbackUrl.searchParams.set("token", token);
  callbackUrl.searchParams.set("central", central || DEFAULT_CENTRAL);
  // Redirect back to the current page (without the token params)
  const clean = new URL(window.location.href);
  clean.searchParams.delete("token");
  clean.searchParams.delete("central");
  callbackUrl.searchParams.set("redirect", clean.pathname + (clean.search || ""));
  window.location.replace(callbackUrl.toString());
  return true;
}

export function BondCentralGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [centralInput, setCentralInput] = useState(DEFAULT_CENTRAL);
  const [tokenInput, setTokenInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If URL has a token, let /bond-auth/callback set the cookie properly
    if (handleUrlTokenRedirect()) return;

    let cancelled = false;
    void (async () => {
      const ok = await checkServerSession();
      if (!cancelled) setStatus(ok ? "authenticated" : "unauthenticated");
    })();
    return () => { cancelled = true; };
  }, []);

  const handleConnect = () => {
    const t = tokenInput.trim();
    const c = centralInput.trim();
    if (!t || !c) { setError("Token and BOND Central URL are required."); return; }
    setSaving(true); setError("");

    // Redirect to callback — it will verify + set httpOnly cookie + redirect back
    const callbackUrl = new URL("/bond-auth/callback", window.location.origin);
    callbackUrl.searchParams.set("token", t);
    callbackUrl.searchParams.set("central", c);
    callbackUrl.searchParams.set("redirect", window.location.pathname);
    window.location.href = callbackUrl.toString();
  };

  if (status === "authenticated") {
    return <>{children}</>;
  }

  return (
    <>
      {/* Always render children behind the overlay so fonts / layout load */}
      <div aria-hidden style={{ visibility: "hidden", pointerEvents: "none" }}>
        {children}
      </div>

      {/* Auth overlay */}
      <div style={OVERLAY}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", width: 500, height: 500, top: "-10%", left: "50%",
          transform: "translateX(-50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(236,72,153,0.12) 0%,transparent 65%)",
          filter: "blur(80px)", pointerEvents: "none",
        }} />

        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(236,72,153,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(236,72,153,0.025) 1px,transparent 1px)",
          backgroundSize: "48px 48px", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, textAlign: "center" }}>
          {status === "checking" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              {/* Spinner */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                border: "2px solid rgba(236,72,153,0.15)",
                borderTopColor: "rgba(236,72,153,0.9)",
                animation: "bond-spin 0.8s linear infinite",
              }} />
              <style>{`@keyframes bond-spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", color: `${ACCENT}0.6)` }}>
                Verifying session…
              </span>
            </div>
          ) : (
            <div style={{
              border: `1px solid ${ACCENT}0.15)`,
              borderRadius: 20,
              background: "rgba(5,2,12,0.8)",
              padding: "36px 32px",
              boxShadow: `0 0 60px ${ACCENT}0.08), 0 20px 60px rgba(0,0,0,0.6)`,
            }}>
              {/* Logo mark */}
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                border: `1px solid ${ACCENT}0.35)`,
                background: `${ACCENT}0.08)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: `0 0 30px ${ACCENT}0.15)`,
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={`${ACCENT}0.9)`} strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M2 17l10 5 10-5" stroke={`${ACCENT}0.7)`} strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M2 12l10 5 10-5" stroke={`${ACCENT}0.5)`} strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Brand */}
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.4em", color: `${ACCENT}0.6)`, marginBottom: 6 }}>
                BOND Studios
              </div>
              <h2 style={{
                fontSize: 18, fontWeight: 700, color: "#fff",
                letterSpacing: "0.05em", marginBottom: 4,
                fontFamily: "inherit",
              }}>
                ConvergeVerse Studio
              </h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
                Accede desde{" "}
                <a
                  href={`${centralInput}/nexus`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: `${ACCENT}0.85)`, textDecoration: "none" }}
                >
                  BOND Central Nexus
                </a>
                {" "}para autenticación automática, o ingresa tu token de acceso.
              </p>

              {error && (
                <div style={{
                  marginBottom: 16, padding: "10px 14px",
                  border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
                  background: "rgba(239,68,68,0.08)", fontSize: 11, color: "rgb(252,165,165)",
                  textAlign: "left",
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: 10, textAlign: "left" }}>
                <label style={{
                  display: "block", fontSize: 9, textTransform: "uppercase",
                  letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", marginBottom: 6,
                }}>
                  BOND Central URL
                </label>
                <input
                  type="text" value={centralInput}
                  onChange={e => setCentralInput(e.target.value)}
                  placeholder="https://bond-central.vercel.app"
                  style={{
                    width: "100%", padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8,
                    background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 12,
                    boxSizing: "border-box", outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20, textAlign: "left" }}>
                <label style={{
                  display: "block", fontSize: 9, textTransform: "uppercase",
                  letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", marginBottom: 6,
                }}>
                  Satellite Token
                </label>
                <textarea
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  rows={3}
                  placeholder="Pega tu satellite token de BOND Central Nexus…"
                  style={{
                    width: "100%", padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8,
                    background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 12,
                    resize: "none", boxSizing: "border-box", outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleConnect}
                disabled={saving}
                style={{
                  width: "100%", padding: "12px 0",
                  border: `1px solid ${ACCENT}0.5)`,
                  borderRadius: 10,
                  background: `${ACCENT}0.12)`,
                  color: `${ACCENT}1)`,
                  fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.2em",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.5 : 1,
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >
                {saving ? "Redirigiendo…" : "Conectar a BOND Central"}
              </button>

              <p style={{
                marginTop: 20, fontSize: 9, color: "rgba(255,255,255,0.2)",
                letterSpacing: "0.2em", textTransform: "uppercase",
              }}>
                BOND Studios · Zero External Storage · Secure
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
