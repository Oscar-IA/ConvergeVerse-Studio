'use client';

interface ScriptPanelProps {
  script: string;
}

export function ScriptPanel({ script }: ScriptPanelProps) {
  if (!script) return null;
  return (
    <section className="bvl-panel bvl-panel--tall">
      <div className="bvl-panel__head font-datum">
        <span className="bvl-panel__label">SCRIPT</span>
        <span className="bvl-panel__meta">{script.length} CHARS</span>
      </div>
      <div className="bvl-panel__body bvl-panel__body--scroll">
        <pre className="bvl-script font-manga-script">{script}</pre>
      </div>
    </section>
  );
}
