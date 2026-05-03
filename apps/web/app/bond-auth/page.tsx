"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

/* Bilingual labels — shown together since we don't know the kid's language yet */
const L: Record<string, [string, string]> & { placeholder?: never } = {
  title:       ["Your Story Studio", "Tu Estudio de Historias"],
  subtitle:    ["Enter your secret code to start creating!", "¡Ingresa tu código secreto para empezar!"],
  codeLabel:   ["Your Secret Code", "Tu Código Secreto"],
  enterBtn:    ["✨ Let's Go!", "✨ ¡Vamos!"],
  loading:     ["Checking…", "Verificando…"],
  hint:        ["Your code was given to you by BOND Studios.", "Tu código te lo dio BOND Studios."],
  adminTab:    ["Parent / Admin", "Padre / Admin"],
  codeTab:     ["🔑 My Code", "🔑 Mi Código"],
  centralMsg:  [
    "This option is for parents and administrators. Open BOND Central to log in.",
    "Esta opción es para padres y administradores. Abre BOND Central para iniciar sesión.",
  ],
  openCentral: ["Open BOND Central →", "Abrir BOND Central →"],
};
const PLACEHOLDER = "BOND-XXXX-2026";

const ERROR_MESSAGES: Record<string, [string, string]> = {
  missing_token:       ["No session token received.", "No se recibió token de sesión."],
  token_invalid:       ["Session expired. Try again.", "Sesión expirada. Intenta de nuevo."],
  invalid_central_url: ["Invalid BOND Central URL.", "URL de BOND Central no válida."],
  invalid_code:        ["That code didn't work. Check it and try again! 🤔", "Ese código no funcionó. ¡Revísalo e inténtalo de nuevo! 🤔"],
  missing_code:        ["Please enter your secret code first.", "Primero ingresa tu código secreto."],
  connection:          ["Connection problem. Check your internet! 🌐", "Problema de conexión. ¡Revisa tu internet! 🌐"],
};

function BothLangs({ pair, style }: { pair: [string, string]; style?: React.CSSProperties }) {
  return (
    <span style={style}>
      {pair[0]}
      <span style={{ opacity: 0.45, marginLeft: 6, fontSize: "0.88em" }}>/ {pair[1]}</span>
    </span>
  );
}

function BondAuthContent() {
  const params  = useSearchParams();
  const router  = useRouter();
  const central = params.get("central") ?? (process.env.NEXT_PUBLIC_BOND_CENTRAL_URL ?? "https://bond-central.vercel.app");
  const urlError = params.get("error");
  const redirect = params.get("redirect") ?? "/";
  const nexusUrl = `${central}/nexus`;

  const [code,      setCode]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [codeError, setCodeError] = useState<[string,string] | null>(null);
  const [tab,       setTab]       = useState<"code" | "central">("code");

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) { setCodeError(ERROR_MESSAGES.missing_code); return; }
    setLoading(true);
    setCodeError(null);
    try {
      const res  = await fetch(`/api/auth/direct?redirect=${encodeURIComponent(redirect)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; redirect?: string };
      if (data.ok) {
        router.replace(data.redirect ?? redirect);
      } else {
        setCodeError(ERROR_MESSAGES[data.error ?? ""] ?? ERROR_MESSAGES.invalid_code);
      }
    } catch {
      setCodeError(ERROR_MESSAGES.connection);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#04010f 0%,#110330 50%,#04010f 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    }}>

      {/* ── Animated stars background ── */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <style>{`
          @keyframes ba-float{0%,100%{transform:translateY(0) rotate(0deg);opacity:0}10%{opacity:0.7}90%{opacity:0.1}100%{transform:translateY(-100vh) rotate(180deg)}}
          @keyframes ba-twinkle{0%,100%{opacity:0.15;transform:scale(1)}50%{opacity:0.7;transform:scale(1.4)}}
          @keyframes ba-pulse-glow{0%,100%{box-shadow:0 0 10px rgba(236,72,153,0.3)}50%{box-shadow:0 0 30px rgba(236,72,153,0.7)}}
          .ba-dot{position:absolute;border-radius:50%;animation:ba-float linear infinite;}
          .ba-star{position:absolute;border-radius:50%;animation:ba-twinkle ease-in-out infinite;}
        `}</style>
        {/* Floating particles */}
        {[
          {l:"8%",t:"85%",s:6,d:11,c:"#ec4899"},{l:"25%",t:"75%",s:4,d:15,c:"#a855f7"},
          {l:"50%",t:"88%",s:7,d:9,c:"#06b6d4"},{l:"72%",t:"80%",s:5,d:13,c:"#ec4899"},
          {l:"88%",t:"83%",s:4,d:12,c:"#f472b6"},{l:"40%",t:"92%",s:3,d:17,c:"#a855f7"},
        ].map((p,i) => (
          <div key={i} className="ba-dot" style={{left:p.l,top:p.t,width:p.s,height:p.s,
            background:p.c,opacity:0.4,animationDuration:`${p.d}s`,animationDelay:`${i*1.8}s`}}/>
        ))}
        {/* Twinkling stars */}
        {Array.from({length:24}).map((_,i) => (
          <div key={i} className="ba-star" style={{
            left:`${(i*13+7)%100}%`,top:`${(i*9+5)%65}%`,
            width: i%5===0 ? 3 : 2, height: i%5===0 ? 3 : 2,
            background: i%3===0 ? "#ec4899" : i%3===1 ? "#a855f7" : "#fff",
            animationDuration:`${1.5+i%4}s`,animationDelay:`${i*0.3}s`,
          }}/>
        ))}
      </div>

      {/* ── Main card ── */}
      <div style={{
        width: "100%", maxWidth: 460,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 28,
        backdropFilter: "blur(24px)",
        overflow: "hidden",
        boxShadow: "0 32px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(236,72,153,0.1)",
        position: "relative", zIndex: 1,
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "36px 36px 28px",
          background: "linear-gradient(180deg,rgba(236,72,153,0.08) 0%,transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          {/* Mascot */}
          <div style={{ textAlign: "center", fontSize: 72, marginBottom: 16,
            animation: "ba-pulse-glow 2s ease-in-out infinite, bond-bounce 2.5s ease-in-out infinite",
            display: "block",
          }}>
            🦸
          </div>
          <style>{`
            @keyframes bond-bounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.04)}}
          `}</style>

          {/* Title */}
          <h1 style={{
            textAlign: "center",
            fontSize: "clamp(1.5rem, 5vw, 2rem)",
            fontWeight: 900,
            margin: "0 0 10px",
            background: "linear-gradient(135deg,#fff 0%,#ec4899 60%,#a855f7 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.01em",
          }}>
            <BothLangs pair={L.title} />
          </h1>
          <p style={{ textAlign: "center", fontSize: 15, color: "rgba(255,255,255,0.5)", margin: "0 0 24px", lineHeight: 1.5 }}>
            <BothLangs pair={L.subtitle} />
          </p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, borderRadius: 12, background: "rgba(255,255,255,0.06)", padding: 4 }}>
            {(["code","central"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
                background: tab === t ? "rgba(236,72,153,0.2)" : "transparent",
                color: tab === t ? "#ec4899" : "rgba(255,255,255,0.35)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                transition: "all 0.2s",
              }}>
                {t === "code" ? (
                  <BothLangs pair={L.codeTab} />
                ) : (
                  <BothLangs pair={L.adminTab} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "28px 36px 36px" }}>

          {/* URL-param error */}
          {urlError && (
            <div style={{
              marginBottom: 20, padding: "12px 16px", borderRadius: 12,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
              fontSize: 14, color: "#fca5a5", lineHeight: 1.5,
            }}>
              {(() => {
                const pair = ERROR_MESSAGES[urlError];
                return pair ? <BothLangs pair={pair} /> : "An error occurred.";
              })()}
            </div>
          )}

          {/* ── Code tab ── */}
          {tab === "code" && (
            <form onSubmit={handleCodeSubmit}>
              <label style={{
                display: "block", fontSize: 13, fontWeight: 700,
                color: "rgba(255,255,255,0.6)", marginBottom: 10,
              }}>
                <BothLangs pair={L.codeLabel} />
              </label>
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError(null); }}
                placeholder={PLACEHOLDER}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: "100%", padding: "16px 18px",
                  background: "rgba(255,255,255,0.08)",
                  border: `2px solid ${codeError ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.15)"}`,
                  borderRadius: 14, color: "#f1f5f9",
                  fontSize: 20, fontFamily: "ui-monospace, monospace",
                  letterSpacing: "0.15em", outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
              {codeError && (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#fca5a5", lineHeight: 1.4 }}>
                  ⚠️ <BothLangs pair={codeError} />
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "17px 0", marginTop: 20,
                  background: loading
                    ? "rgba(236,72,153,0.3)"
                    : "linear-gradient(135deg,#ec4899,#a855f7)",
                  border: "none", borderRadius: 14, color: "#fff",
                  fontSize: 18, fontWeight: 800,
                  cursor: loading ? "default" : "pointer",
                  fontFamily: "inherit",
                  boxShadow: loading ? "none" : "0 6px 30px rgba(236,72,153,0.4), 0 3px 0 rgba(0,0,0,0.4)",
                  transform: loading ? "none" : "translateY(0)",
                  transition: "all 0.15s",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {loading
                  ? <BothLangs pair={L.loading} />
                  : <BothLangs pair={L.enterBtn} />
                }
              </button>

              <p style={{
                marginTop: 18, fontSize: 12, color: "rgba(255,255,255,0.28)",
                textAlign: "center", lineHeight: 1.5,
              }}>
                <BothLangs pair={L.hint} />
              </p>
            </form>
          )}

          {/* ── BOND Central / Admin tab ── */}
          {tab === "central" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
              <p style={{
                fontSize: 14, color: "rgba(255,255,255,0.5)",
                lineHeight: 1.65, marginBottom: 28,
              }}>
                <BothLangs pair={L.centralMsg} />
              </p>
              <a
                href={`${nexusUrl}?redirect=${encodeURIComponent(redirect)}`}
                style={{
                  display: "inline-block", padding: "14px 28px",
                  background: "rgba(6,182,212,0.12)",
                  border: "1px solid rgba(6,182,212,0.35)",
                  borderRadius: 14, color: "#06b6d4",
                  fontSize: 14, fontWeight: 700,
                  textDecoration: "none", letterSpacing: "0.04em",
                  transition: "background 0.2s",
                }}
              >
                <BothLangs pair={L.openCentral} />
              </a>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "14px 36px",
          textAlign: "center",
          fontSize: 10, color: "rgba(255,255,255,0.15)",
          letterSpacing: "0.18em", textTransform: "uppercase",
          fontFamily: "ui-monospace, monospace",
        }}>
          BOND Studios · ConvergeVerse Studio · v0.5
        </div>
      </div>
    </main>
  );
}

export default function BondAuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#04010f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 48 }}>🌟</div>
    </div>}>
      <BondAuthContent />
    </Suspense>
  );
}
