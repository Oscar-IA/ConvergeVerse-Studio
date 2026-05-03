"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: "No session token received.",
  token_invalid: "Session token is invalid or expired.",
  invalid_central_url: "Invalid BOND Central URL.",
  invalid_code: "Access code not recognized. Please check and try again.",
  missing_code: "Please enter your access code.",
};

function BondAuthContent() {
  const params = useSearchParams();
  const router = useRouter();
  const central =
    params.get("central") ??
    (process.env.NEXT_PUBLIC_BOND_CENTRAL_URL ?? "https://bond-central.vercel.app");
  const urlError = params.get("error");
  const redirect = params.get("redirect") ?? "/";
  const nexusUrl = `${central}/nexus`;

  // Direct code form state
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [tab, setTab] = useState<"code" | "central">("code");

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setCodeError("Enter your access code."); return; }
    setLoading(true);
    setCodeError("");
    try {
      const res = await fetch(
        `/api/auth/direct?redirect=${encodeURIComponent(redirect)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim() }),
        }
      );
      const data = (await res.json()) as { ok: boolean; error?: string; redirect?: string };
      if (data.ok) {
        router.replace(data.redirect ?? redirect);
      } else {
        setCodeError(
          ERROR_MESSAGES[data.error ?? ""] ?? "Invalid code. Please try again."
        );
      }
    } catch {
      setCodeError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#04010f 0%,#0d0520 50%,#04010f 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Ambient particles */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <style>{`
          @keyframes ba-float{0%,100%{transform:translateY(0);opacity:0}10%{opacity:0.5}90%{opacity:0.1}100%{transform:translateY(-100vh)}}
          @keyframes ba-pulse{0%,100%{opacity:0.15}50%{opacity:0.45}}
          .ba-dot{position:absolute;border-radius:50%;animation:ba-float linear infinite;}
          .ba-star{position:absolute;width:2px;height:2px;border-radius:50%;animation:ba-pulse ease-in-out infinite;}
        `}</style>
        {[{l:"10%",t:"80%",s:4,d:10,c:"#ec4899"},{l:"30%",t:"70%",s:3,d:14,c:"#a855f7"},
          {l:"55%",t:"85%",s:5,d:12,c:"#06b6d4"},{l:"75%",t:"75%",s:3,d:9,c:"#ec4899"},
          {l:"90%",t:"82%",s:4,d:13,c:"#a855f7"}].map((p,i)=>(
          <div key={i} className="ba-dot" style={{left:p.l,top:p.t,width:p.s,height:p.s,background:p.c,opacity:0.3,animationDuration:`${p.d}s`,animationDelay:`${i*2}s`}}/>
        ))}
        {Array.from({length:16}).map((_,i)=>(
          <div key={i} className="ba-star" style={{left:`${(i*7+5)%100}%`,top:`${(i*11+3)%50}%`,
            background:i%3===0?"#ec4899":i%3===1?"#a855f7":"#06b6d4",
            animationDuration:`${2+i%3}s`,animationDelay:`${i*0.4}s`}}/>
        ))}
      </div>

      <div style={{
        width: "100%", maxWidth: 420,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 24,
        backdropFilter: "blur(20px)",
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(236,72,153,0.08)",
        position: "relative", zIndex: 1,
      }}>
        {/* Header */}
        <div style={{
          padding: "32px 32px 0",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          paddingBottom: 24, marginBottom: 0,
          background: "linear-gradient(180deg,rgba(236,72,153,0.06) 0%,transparent 100%)",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: "rgba(236,72,153,0.12)",
              border: "2px solid rgba(236,72,153,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 32, height: 32 }}>
                <path d="M12 3L3 8.5V15.5L12 21L21 15.5V8.5L12 3Z"
                  stroke="#ec4899" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.5" fill="#ec4899" />
              </svg>
            </div>
          </div>
          <h1 style={{
            textAlign: "center", fontSize: 11, fontFamily: "ui-monospace,monospace",
            letterSpacing: "0.35em", color: "rgba(236,72,153,0.8)",
            textTransform: "uppercase", margin: "0 0 4px",
          }}>
            ConvergeVerse Studio
          </h1>
          <p style={{
            textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.45)",
            margin: "0 0 24px",
          }}>
            BOND Studios — Authentication
          </p>

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 0, borderRadius: 10, background: "rgba(255,255,255,0.05)", padding: 4 }}>
            {(["code","central"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                  background: tab === t ? "rgba(236,72,153,0.18)" : "transparent",
                  color: tab === t ? "#ec4899" : "rgba(255,255,255,0.35)",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  fontFamily: "ui-monospace,monospace", letterSpacing: "0.1em",
                  transition: "all 0.2s",
                }}>
                {t === "code" ? "🔑 ACCESS CODE" : "⬡ BOND CENTRAL"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 32px 32px" }}>

          {/* Error from URL params */}
          {urlError && (
            <div style={{
              marginBottom: 16, padding: "10px 14px", borderRadius: 10,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
              fontSize: 12, color: "#fca5a5",
            }}>
              {ERROR_MESSAGES[urlError] ?? "An error occurred. Please try again."}
            </div>
          )}

          {/* ── Access Code Tab ── */}
          {tab === "code" && (
            <form onSubmit={handleCodeSubmit}>
              <div style={{ marginBottom: 8 }}>
                <label style={{
                  display: "block", fontSize: 10, color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  marginBottom: 8, fontFamily: "ui-monospace,monospace",
                }}>
                  Your Access Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError(""); }}
                  placeholder="BOND-XXXX-2026"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    width: "100%", padding: "14px 16px",
                    background: "rgba(255,255,255,0.07)",
                    border: `1px solid ${codeError ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
                    borderRadius: 12, color: "#f1f5f9",
                    fontSize: 16, fontFamily: "ui-monospace,monospace",
                    letterSpacing: "0.15em", outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                />
                {codeError && (
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#fca5a5" }}>
                    ⚠️ {codeError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "14px 0", marginTop: 16,
                  background: loading
                    ? "rgba(236,72,153,0.3)"
                    : "linear-gradient(135deg,#ec4899,#a855f7)",
                  border: "none", borderRadius: 12, color: "#fff",
                  fontSize: 14, fontWeight: 800, cursor: loading ? "default" : "pointer",
                  fontFamily: "inherit", letterSpacing: "0.05em",
                  boxShadow: loading ? "none" : "0 4px 20px rgba(236,72,153,0.3)",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "Verifying…" : "✨ Enter Studio"}
              </button>

              <p style={{
                marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)",
                textAlign: "center", lineHeight: 1.5,
              }}>
                Access codes are issued by BOND Studios.<br />
                Contact your administrator to get yours.
              </p>
            </form>
          )}

          {/* ── BOND Central Tab ── */}
          {tab === "central" && (
            <div>
              <p style={{
                fontSize: 13, color: "rgba(255,255,255,0.45)",
                lineHeight: 1.65, marginBottom: 24, textAlign: "center",
              }}>
                ConvergeVerse requires an active{" "}
                <span style={{ color: "#06b6d4" }}>BOND Central</span> session.
                Open the app from the Nexus to authenticate.
              </p>
              <a
                href={`${nexusUrl}?redirect=${encodeURIComponent(redirect)}`}
                style={{
                  display: "block", width: "100%", padding: "14px 0",
                  background: "rgba(6,182,212,0.12)",
                  border: "1px solid rgba(6,182,212,0.35)",
                  borderRadius: 12, color: "#06b6d4",
                  fontSize: 13, fontWeight: 700, textAlign: "center",
                  textDecoration: "none", letterSpacing: "0.08em",
                  fontFamily: "ui-monospace,monospace",
                  transition: "background 0.2s",
                  boxSizing: "border-box" as const,
                }}
              >
                Open in BOND Central →
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 32px",
          textAlign: "center",
          fontSize: 9, color: "rgba(255,255,255,0.18)",
          fontFamily: "ui-monospace,monospace", letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}>
          BOND Studios · Zero External Storage · v14
        </div>
      </div>
    </main>
  );
}

export default function BondAuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#04010f" }} />}>
      <BondAuthContent />
    </Suspense>
  );
}
