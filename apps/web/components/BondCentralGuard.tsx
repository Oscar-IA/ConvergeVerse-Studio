'use client';
import { useEffect, useState } from "react";

const DEFAULT_CENTRAL = "https://bond-central.vercel.app";
const ACCENT = "rgba(236,72,153,";

const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9998,
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  background: "rgba(5,2,8,0.92)", backdropFilter: "blur(6px)",
  padding: 24, color: "#fff",
  fontFamily: "ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace",
};

async function verifyToken(token: string, centralUrl: string): Promise<boolean> {
  if (!token) return false;
  try {
    const url = new URL("/api/auth/satellite-token", centralUrl);
    url.searchParams.set("token", token);
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return false;
    const data = (await res.json()) as { valid?: boolean };
    return !!data.valid;
  } catch { return false; }
}

function consumeUrlToken(): { token: string; central: string } | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token")?.trim() ?? "";
  const central = params.get("central")?.trim() ?? "";
  if (!token) return null;
  try {
    const clean = new URL(window.location.href);
    clean.searchParams.delete("token");
    clean.searchParams.delete("central");
    window.history.replaceState({}, "", clean.pathname + (clean.search || ""));
  } catch { /* ignore */ }
  return { token, central: central || DEFAULT_CENTRAL };
}

export function BondCentralGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [centralInput, setCentralInput] = useState(DEFAULT_CENTRAL);
  const [tokenInput, setTokenInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const urlCreds = consumeUrlToken();
      if (urlCreds) {
        if (!cancelled) setCentralInput(urlCreds.central);
        const valid = await verifyToken(urlCreds.token, urlCreds.central);
        if (!cancelled && valid) {
          sessionStorage.setItem("bond_satellite_session", urlCreds.token);
          sessionStorage.setItem("bond_central_url", urlCreds.central);
          setStatus("authenticated");
          return;
        }
      }
      const storedToken = sessionStorage.getItem("bond_satellite_session") ?? "";
      const storedCentral = sessionStorage.getItem("bond_central_url") ?? DEFAULT_CENTRAL;
      if (!cancelled) setCentralInput(storedCentral);
      const valid = storedToken ? await verifyToken(storedToken, storedCentral) : false;
      if (!cancelled) setStatus(valid ? "authenticated" : "unauthenticated");
    })();
    return () => { cancelled = true; };
  }, []);

  const handleConnect = async () => {
    const t = tokenInput.trim(); const c = centralInput.trim();
    if (!t || !c) { setError("Token and BOND Central URL are required."); return; }
    setSaving(true); setError("");
    const valid = await verifyToken(t, c);
    if (!valid) { setSaving(false); setError("Token invalid or expired. Open ConvergeVerse from BOND Central Nexus."); return; }
    sessionStorage.setItem("bond_satellite_session", t);
    sessionStorage.setItem("bond_central_url", c);
    setStatus("authenticated"); setSaving(false);
  };

  return (
    <>
      {children}
      {status === "checking" && (
        <div style={OVERLAY}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.3em", color: `${ACCENT}0.7)` }}>
            Verifying BOND Central session…
          </span>
        </div>
      )}
      {status === "unauthenticated" && (
        <div style={OVERLAY}>
          <div style={{ width: "100%", maxWidth: 380, border: `1px solid ${ACCENT}0.15)`, borderRadius: 16, background: `${ACCENT}0.04)`, padding: 32, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, border: `1px solid ${ACCENT}0.4)`, background: `${ACCENT}0.1)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 20h9" stroke={`${ACCENT}0.5)`} strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke={`${ACCENT}0.9)`} strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", color: `${ACCENT}0.8)`, marginBottom: 6 }}>CONVERGEVERSE STUDIO</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>BOND Central session required</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 20 }}>
              Open ConvergeVerse from{" "}
              <a href={`${centralInput}/nexus`} target="_blank" rel="noopener noreferrer" style={{ color: `${ACCENT}0.9)` }}>BOND Central Nexus</a>
              {" "}to auto-connect, or paste your token below.
            </p>
            {error && <div style={{ marginBottom: 14, padding: "8px 12px", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, background: "rgba(239,68,68,0.08)", fontSize: 11, color: "rgb(252,165,165)" }}>{error}</div>}
            <div style={{ marginBottom: 10, textAlign: "left" }}>
              <label style={{ display: "block", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>BOND Central URL</label>
              <input type="text" value={centralInput} onChange={e => setCentralInput(e.target.value)} placeholder="https://bond-central.vercel.app" style={{ width: "100%", padding: "8px 10px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, boxSizing: "border-box" }}/>
            </div>
            <div style={{ marginBottom: 20, textAlign: "left" }}>
              <label style={{ display: "block", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Satellite Token</label>
              <textarea value={tokenInput} onChange={e => setTokenInput(e.target.value)} rows={3} placeholder="Paste satellite token from BOND Central Nexus…" style={{ width: "100%", padding: "8px 10px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, resize: "none", boxSizing: "border-box" }}/>
            </div>
            <button type="button" onClick={() => void handleConnect()} disabled={saving} style={{ width: "100%", padding: 12, border: `1px solid ${ACCENT}0.5)`, borderRadius: 8, background: `${ACCENT}0.1)`, color: `${ACCENT}1)`, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.5 : 1 }}>
              {saving ? "Verifying…" : "Connect to BOND Central"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
