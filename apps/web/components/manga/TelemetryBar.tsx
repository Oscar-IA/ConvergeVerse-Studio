'use client';

interface TelemetryBarProps {
  panelCount: number;
  scriptLength: number | null;
  loading: boolean;
  beatsProcessed?: number;
}

export function TelemetryBar({ panelCount, scriptLength, loading, beatsProcessed }: TelemetryBarProps) {
  return (
    <aside className="telemetry-bar orbet-readout">
      <div className="telemetry-bar__row">
        <strong>ORBET.TELEMETRY</strong>
        <span className="font-datum" style={{ opacity: 0.7 }}>
          CONVERGENCE_INSTITUTE
        </span>
      </div>
      <div className="telemetry-bar__grid font-datum">
        <div>
          <span className="telemetry-bar__k">PIPELINE</span>
          <span className="telemetry-bar__v">{loading ? 'RUNNING' : 'STANDBY'}</span>
        </div>
        <div>
          <span className="telemetry-bar__k">PANELS</span>
          <span className="telemetry-bar__v">{panelCount}</span>
        </div>
        <div>
          <span className="telemetry-bar__k">SCRIPT</span>
          <span className="telemetry-bar__v">{scriptLength ?? '—'}</span>
        </div>
        <div>
          <span className="telemetry-bar__k">BEATS</span>
          <span className="telemetry-bar__v">{beatsProcessed ?? '—'}</span>
        </div>
      </div>
    </aside>
  );
}
