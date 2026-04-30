export default function Loading() {
  return (
    <div style={{
      position:"fixed",inset:0,background:"#050208",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace",
      userSelect:"none",zIndex:9999,overflow:"hidden",
    }}>
      <style>{`
        @keyframes cv-slide  { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes cv-bar    { from{width:0%} to{width:88%} }
        @keyframes cv-shim   { 0%{transform:translateX(-100%)skewX(-15deg)} 100%{transform:translateX(300%)skewX(-15deg)} }
        @keyframes cv-drift  { from{transform:translate(0,0)} to{transform:translate(16px,-14px)} }
        @keyframes cv-pulse  { 0%,100%{opacity:.07} 50%{opacity:.16} }
        @keyframes cv-flow   { from{stroke-dashoffset:200} to{stroke-dashoffset:0} }
        @keyframes cv-nfade  { from{opacity:0;transform:scale(.3)} to{opacity:1;transform:scale(1)} }
        @keyframes cv-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes cv-type   { from{max-width:0} to{max-width:100%} }
        @keyframes cv-ink    { from{r:0;opacity:.8} to{r:120;opacity:0} }
        @keyframes cv-scan   { from{top:-1px} to{top:102%} }
        @keyframes cv-orbit  { from{transform:rotate(0deg) translateX(60px) rotate(0deg)} to{transform:rotate(360deg) translateX(60px) rotate(-360deg)} }
        @keyframes cv-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes cv-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

        .cv-da{animation:cv-drift 7s ease-in-out infinite alternate}
        .cv-db{animation:cv-drift 9s ease-in-out 1.8s infinite alternate-reverse}
        .cv-pa{animation:cv-pulse 4s ease-in-out infinite}
        .cv-pb{animation:cv-pulse 5.5s ease-in-out 1.2s infinite}
        .cv-hl{animation:cv-scan 3.5s linear infinite}
        .cv-shim{animation:cv-shim 2.4s linear infinite}
        .cv-cursor{animation:cv-cursor 1s step-end infinite}
        .cv-float{animation:cv-float 3s ease-in-out infinite}

        .cv-type1{animation:cv-type .6s .4s ease-out both;display:inline-block;overflow:hidden;white-space:nowrap}
        .cv-type2{animation:cv-type .5s 1.0s ease-out both;display:inline-block;overflow:hidden;white-space:nowrap}
        .cv-type3{animation:cv-type .4s 1.6s ease-out both;display:inline-block;overflow:hidden;white-space:nowrap}

        .cv-br1{animation:cv-flow .9s .5s ease-out both;stroke-dasharray:200;stroke-dashoffset:200}
        .cv-br2{animation:cv-flow .9s .9s ease-out both;stroke-dasharray:200;stroke-dashoffset:200}
        .cv-br3{animation:cv-flow .9s 1.3s ease-out both;stroke-dasharray:200;stroke-dashoffset:200}
        .cv-br4{animation:cv-flow .9s 1.7s ease-out both;stroke-dasharray:200;stroke-dashoffset:200}

        .cv-n1{animation:cv-nfade .4s .4s ease-out both}
        .cv-n2{animation:cv-nfade .4s .8s ease-out both}
        .cv-n3{animation:cv-nfade .4s 1.1s ease-out both}
        .cv-n4{animation:cv-nfade .4s 1.4s ease-out both}
        .cv-n5{animation:cv-nfade .4s 1.7s ease-out both}

        .cv-l1{animation:cv-slide .35s .5s ease-out both}
        .cv-l2{animation:cv-slide .35s 1.1s ease-out both}
        .cv-l3{animation:cv-slide .35s 1.7s ease-out both}
        .cv-l4{animation:cv-slide .35s 2.3s ease-out both}
        .cv-l5{animation:cv-slide .35s 2.9s ease-out both}
        .cv-bar{animation:cv-bar 3.5s cubic-bezier(.05,0,.15,1) .5s both}

        @media(prefers-reduced-motion:reduce){
          .cv-da,.cv-db,.cv-pa,.cv-pb,.cv-hl,.cv-shim,.cv-cursor,.cv-float{animation:none}
          .cv-type1,.cv-type2,.cv-type3{animation:none;max-width:100%}
          .cv-br1,.cv-br2,.cv-br3,.cv-br4{animation:none;stroke-dashoffset:0}
          .cv-n1,.cv-n2,.cv-n3,.cv-n4,.cv-n5{animation:none;opacity:1}
          .cv-l1,.cv-l2,.cv-l3,.cv-l4,.cv-l5{animation:none;opacity:1}
          .cv-bar{animation:none;width:80%}
        }
      `}</style>

      {/* Ambient glows */}
      <div className="cv-da cv-pa" style={{position:"absolute",width:400,height:400,top:"3%",left:"5%",borderRadius:"50%",background:"radial-gradient(circle,rgba(236,72,153,.13) 0%,transparent 62%)",filter:"blur(70px)"}}/>
      <div className="cv-db cv-pb" style={{position:"absolute",width:320,height:320,bottom:"6%",right:"6%",borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,.1) 0%,transparent 62%)",filter:"blur(60px)"}}/>

      {/* Ink bloom SVG background */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        <circle cx="400" cy="300" className="cv-pa" r="200" fill="none" stroke="rgba(236,72,153,.04)" strokeWidth="60"/>
        <circle cx="400" cy="300" className="cv-pb" r="120" fill="none" stroke="rgba(168,85,247,.04)" strokeWidth="40"/>
      </svg>

      {/* Fine rose grid */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(236,72,153,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(236,72,153,.03) 1px,transparent 1px)",backgroundSize:"44px 44px"}}/>

      {/* Horizontal scan line */}
      <div className="cv-hl" style={{position:"absolute",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(236,72,153,.35),transparent)",pointerEvents:"none"}}/>

      {/* Main content */}
      <div style={{position:"relative",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",gap:"2rem",maxWidth:460,width:"100%",padding:"0 2rem",textAlign:"center"}}>

        {/* Story branch SVG + typewriter */}
        <div className="cv-float" style={{position:"relative",width:220,height:150}}>
          <svg width="220" height="150" viewBox="0 0 220 150" fill="none" style={{position:"absolute",inset:0}}>
            {/* Root to branches */}
            <line className="cv-br1" x1="110" y1="130" x2="110" y2="80" stroke="rgba(236,72,153,.7)" strokeWidth="1.5"/>
            <line className="cv-br2" x1="110" y1="80" x2="40" y2="30" stroke="rgba(236,72,153,.6)" strokeWidth="1.2"/>
            <line className="cv-br3" x1="110" y1="80" x2="180" y2="30" stroke="rgba(236,72,153,.6)" strokeWidth="1.2"/>
            <line className="cv-br4" x1="110" y1="80" x2="110" y2="30" stroke="rgba(168,85,247,.6)" strokeWidth="1.2"/>

            {/* Root node */}
            <g className="cv-n1">
              <circle cx="110" cy="130" r="10" fill="rgba(236,72,153,.15)" stroke="rgba(236,72,153,.85)" strokeWidth="1.5"/>
              <circle cx="110" cy="130" r="3.5" fill="rgba(236,72,153,.9)"/>
            </g>
            {/* Junction node */}
            <g className="cv-n2">
              <circle cx="110" cy="80" r="7" fill="rgba(236,72,153,.12)" stroke="rgba(236,72,153,.7)" strokeWidth="1.2"/>
              <circle cx="110" cy="80" r="2.5" fill="rgba(236,72,153,.75)"/>
            </g>
            {/* Leaf nodes */}
            <g className="cv-n3">
              <circle cx="40" cy="30" r="7" fill="rgba(168,85,247,.12)" stroke="rgba(168,85,247,.75)" strokeWidth="1.2"/>
              <circle cx="40" cy="30" r="2.5" fill="rgba(168,85,247,.8)"/>
            </g>
            <g className="cv-n4">
              <circle cx="180" cy="30" r="7" fill="rgba(168,85,247,.12)" stroke="rgba(168,85,247,.75)" strokeWidth="1.2"/>
              <circle cx="180" cy="30" r="2.5" fill="rgba(168,85,247,.8)"/>
            </g>
            <g className="cv-n5">
              <circle cx="110" cy="30" r="7" fill="rgba(236,72,153,.12)" stroke="rgba(236,72,153,.7)" strokeWidth="1.2"/>
              <circle cx="110" cy="30" r="2.5" fill="rgba(236,72,153,.75)"/>
            </g>
          </svg>
          {/* Branch labels */}
          <div className="cv-n3" style={{position:"absolute",top:4,left:0,fontSize:".38rem",color:"rgba(168,85,247,.7)",letterSpacing:".06em",whiteSpace:"nowrap"}}>ARC·1</div>
          <div className="cv-n5" style={{position:"absolute",top:4,left:"50%",transform:"translateX(-50%)",fontSize:".38rem",color:"rgba(236,72,153,.7)",letterSpacing:".06em",whiteSpace:"nowrap"}}>ARC·2</div>
          <div className="cv-n4" style={{position:"absolute",top:4,right:0,fontSize:".38rem",color:"rgba(168,85,247,.7)",letterSpacing:".06em",whiteSpace:"nowrap"}}>ARC·3</div>
        </div>

        {/* Typewriter area */}
        <div style={{borderLeft:"2px solid rgba(236,72,153,.5)",paddingLeft:"1rem",textAlign:"left",width:"100%",maxWidth:340}}>
          <div style={{fontSize:".48rem",color:"rgba(255,255,255,.3)",marginBottom:".3rem",letterSpacing:".1em"}}>// narrative_engine.init()</div>
          <div style={{fontSize:".55rem",color:"rgba(236,72,153,.8)",letterSpacing:".06em"}}>
            <span className="cv-type1">story.branch("chapter_01")</span>
          </div>
          <div style={{fontSize:".55rem",color:"rgba(168,85,247,.8)",letterSpacing:".06em",marginTop:".15rem"}}>
            <span className="cv-type2">ai.suggest(tone: "epic")</span>
          </div>
          <div style={{fontSize:".55rem",color:"rgba(255,255,255,.6)",letterSpacing:".06em",marginTop:".15rem"}}>
            <span className="cv-type3">export.publish("web, mobile")</span>
          </div>
          <span className="cv-cursor" style={{display:"inline-block",width:"2px",height:".65rem",background:"rgba(236,72,153,.8)",marginLeft:"3px",verticalAlign:"text-bottom"}}/>
        </div>

        {/* Title */}
        <div>
          <div style={{fontSize:".48rem",fontWeight:700,letterSpacing:".4em",color:"rgba(236,72,153,.5)",textTransform:"uppercase",marginBottom:".4rem"}}>BOND ECOSYSTEM · NARRATIVE INTELLIGENCE</div>
          <h1 style={{fontSize:"1.7rem",fontWeight:900,fontStyle:"italic",textTransform:"uppercase",letterSpacing:".45em",color:"#fff",margin:0,textShadow:"0 0 45px rgba(236,72,153,.35)"}}>CONVERGEVERSE</h1>
          <p style={{fontSize:".48rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".22em",color:"rgba(236,72,153,.65)",marginTop:".4rem"}}>STORY ENGINE · CREATIVE AI · CROSS-PLATFORM PUBLISH</p>
        </div>

        {/* Boot log */}
        <div style={{width:"100%",textAlign:"left",display:"flex",flexDirection:"column",gap:".27rem"}}>
          {([
            ["cv-l1","✓","rgba(52,211,153,.75)","NARRATIVE ENGINE v3.1 .......... ONLINE","rgba(255,255,255,.38)"],
            ["cv-l2","✓","rgba(52,211,153,.75)","STORY LIBRARY INDEX ............ LOADED","rgba(255,255,255,.38)"],
            ["cv-l3","✓","rgba(52,211,153,.75)","AI NARRATIVE ASSISTANT ......... ACTIVE","rgba(255,255,255,.38)"],
            ["cv-l4","✓","rgba(52,211,153,.75)","MULTI-AUTHOR CO-EDIT LAYER ..... READY","rgba(255,255,255,.38)"],
            ["cv-l5","▶","rgba(236,72,153,.95)","CROSS-PLATFORM EXPORT GRID ..... SYNCING","rgba(236,72,153,.9)"],
          ] as [string,string,string,string,string][]).map(([cls,icon,ic,text,tc],i)=>(
            <div key={i} className={cls} style={{display:"flex",gap:".45rem",alignItems:"center"}}>
              <span style={{color:ic,fontSize:".52rem",minWidth:".85rem"}}>{icon}</span>
              <span style={{fontSize:".5rem",letterSpacing:".06em",color:tc}}>{text}</span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div style={{width:"100%"}}>
          <div style={{height:2,background:"rgba(236,72,153,.07)",borderRadius:999,overflow:"hidden",border:"1px solid rgba(236,72,153,.1)"}}>
            <div className="cv-bar" style={{height:"100%",width:0,background:"linear-gradient(90deg,rgba(168,85,247,.6),#ec4899)",boxShadow:"0 0 14px rgba(236,72,153,.8)",borderRadius:999,position:"relative",overflow:"hidden"}}>
              <div className="cv-shim" style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 30%,rgba(255,255,255,.4) 50%,transparent 70%)"}}/>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:".4rem",fontSize:".48rem"}}>
            <span style={{color:"rgba(236,72,153,.58)",letterSpacing:".1em",textTransform:"uppercase"}}>BOOTING STORY ENGINE</span>
            <span style={{color:"rgba(255,255,255,.22)"}}>v0.3.0</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{position:"absolute",bottom:"1.5rem",display:"flex",alignItems:"center",gap:".5rem",opacity:.28}}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
        <span style={{fontSize:".44rem",fontWeight:900,textTransform:"uppercase",letterSpacing:".3em",color:"#fff"}}>BOND Studios · Secure Environment</span>
      </div>
    </div>
  );
}
