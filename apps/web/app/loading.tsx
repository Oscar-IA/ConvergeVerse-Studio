export default function Loading() {
  return (
    <div style={{ position:"fixed", inset:0, background:"#020202", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace", userSelect:"none", zIndex:9999 }}>
      <style>{`
        @keyframes bond-drift { from{transform:translate(0,0)} to{transform:translate(18px,-14px)} }
        @keyframes bond-shimmer { 0%{transform:translateX(-100%) skewX(-15deg)} 100%{transform:translateX(200%) skewX(-15deg)} }
        @keyframes bond-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes bond-bar { from{width:12%} to{width:88%} }
        .b-glow-a { position:absolute;width:280px;height:280px;top:18%;left:12%;border-radius:50%;background:#ec4899;filter:blur(80px);opacity:0.1;animation:bond-drift 5s ease-in-out infinite alternate }
        .b-glow-b { position:absolute;width:200px;height:200px;top:55%;left:62%;border-radius:50%;background:#ec4899;filter:blur(70px);opacity:0.08;animation:bond-drift 5s ease-in-out 2s infinite alternate-reverse }
        .b-shimmer { position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.2) 50%,transparent 70%);animation:bond-shimmer 2.2s cubic-bezier(.4,0,.2,1) infinite }
        .b-bar { height:100%;border-radius:999px;background:#ec4899;box-shadow:0 0 12px #ec4899;position:relative;overflow:hidden;animation:bond-bar 1.8s ease-in-out infinite alternate }
        .b-dot { width:6px;height:6px;border-radius:50%;background:#ec4899;animation:bond-blink 1s ease-in-out infinite }
      `}</style>
      <div aria-hidden className="b-glow-a" />
      <div aria-hidden className="b-glow-b" />
      <div style={{ position:"relative",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",gap:"2.5rem",maxWidth:380,padding:"2rem",textAlign:"center" }}>
        <div style={{ position:"relative",width:112,height:112,borderRadius:"2.5rem",background:"rgba(0,0,0,0.4)",backdropFilter:"blur(20px)",border:"2px solid rgba(236,72,153,0.3)",boxShadow:"0 0 40px rgba(236,72,153,0.15)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden" }}>
          <span style={{ fontSize:"3.2rem",fontWeight:900,fontStyle:"italic",color:"#ec4899",textShadow:"0 0 20px #ec4899" }}>C</span>
          <div aria-hidden className="b-shimmer" />
        </div>
        <div>
          <h1 style={{ fontSize:"1.75rem",fontWeight:900,fontStyle:"italic",textTransform:"uppercase",letterSpacing:"0.8em",color:"#fff",margin:0 }}>CONVERGEVERSE</h1>
          <p style={{ fontSize:"0.55rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4em",color:"#ec4899",marginTop:"0.4rem" }}>NARRATIVE STUDIO · CREATIVE AI</p>
        </div>
        <div style={{ width:"100%" }}>
          <div style={{ height:2,width:"100%",background:"rgba(255,255,255,0.06)",borderRadius:999,overflow:"hidden",border:"1px solid rgba(255,255,255,0.04)" }}>
            <div className="b-bar"><div aria-hidden className="b-shimmer" /></div>
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"0.5rem",fontSize:"0.55rem" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
              <div aria-hidden className="b-dot" />
              <span style={{ textTransform:"uppercase",letterSpacing:"0.15em",color:"rgba(236,72,153,0.8)" }}>Loading…</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position:"absolute",bottom:"1.25rem",display:"flex",alignItems:"center",gap:"0.5rem",opacity:0.3 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
        <span style={{ fontSize:"0.5rem",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.3em",color:"#fff" }}>BOND Studios · Secure Environment</span>
      </div>
    </div>
  );
}
