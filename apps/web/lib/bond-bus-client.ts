/**
 * BOND Bus Client — connects any BOND Studios project to the central event mesh.
 *
 * Usage:
 *   const bus = createBondBusClient({ nodeId: "wealthpilot", name: "WealthPilot" });
 *   await bus.register();
 *   bus.on("trade_executed", (evt) => console.log(evt));
 *   await bus.emit("project_saved", { projectId: "abc" });
 *   bus.disconnect();
 */

export type BondBusEvent = {
  id: string;
  type: string;
  source: string;
  payload: unknown;
  ts: number;
};

export type BondBusEventHandler = (event: BondBusEvent) => void;

export interface BondBusClientOptions {
  /** Unique ID for this node (e.g. "wealthpilot", "bond-vision", "convergeverse") */
  nodeId: string;
  /** Human-readable name */
  name?: string;
  /** URL of the BOND_OS hub (default: http://127.0.0.1:3765) */
  hubUrl?: string;
  /** Bearer secret (matches BOND_BUS_SECRET in BOND_OS .env) */
  secret?: string;
  /** Event types this node wants to receive (undefined = all) */
  subscribeTypes?: string[];
}

export function createBondBusClient(opts: BondBusClientOptions) {
  const hubUrl = (opts.hubUrl ?? "http://127.0.0.1:3765").replace(/\/$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.secret) headers["Authorization"] = `Bearer ${opts.secret}`;

  const listeners = new Map<string, Set<BondBusEventHandler>>();
  let eventSource: EventSource | null = null;
  let registered = false;

  /** Register this node with the hub */
  async function register(): Promise<void> {
    try {
      await fetch(`${hubUrl}/api/bond-bus/register`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nodeId: opts.nodeId, name: opts.name ?? opts.nodeId }),
      });
      registered = true;
    } catch {
      console.warn("[BOND Bus] Could not register with hub — hub offline?");
    }
  }

  /** Open SSE stream and start routing events to listeners */
  function connect(): void {
    if (typeof EventSource === "undefined") return; // Node.js env — skip SSE
    const types = opts.subscribeTypes?.join(",") ?? "";
    const url = `${hubUrl}/api/bond-bus/stream?nodeId=${encodeURIComponent(opts.nodeId)}${types ? `&types=${encodeURIComponent(types)}` : ""}`;
    const authHeader = opts.secret ? `&_auth=${encodeURIComponent(opts.secret)}` : "";
    // Note: EventSource doesn't support custom headers natively.
    // For environments that support it (Node fetch-based), pass via query param.
    eventSource = new EventSource(url + authHeader);
    eventSource.onmessage = (e: MessageEvent) => {
      try {
        const event: BondBusEvent = JSON.parse(e.data as string);
        const handlers = listeners.get(event.type);
        if (handlers) handlers.forEach((h) => { try { h(event); } catch {} });
        const wildcards = listeners.get("*");
        if (wildcards) wildcards.forEach((h) => { try { h(event); } catch {} });
      } catch {}
    };
    eventSource.onerror = () => {
      // SSE auto-reconnects; no action needed
    };
  }

  /** Subscribe to an event type ("*" = all) */
  function on(type: string, handler: BondBusEventHandler): () => void {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(handler);
    return () => listeners.get(type)?.delete(handler);
  }

  /** Emit an event to the bus */
  async function emit(type: string, payload?: unknown): Promise<string | null> {
    try {
      const res = await fetch(`${hubUrl}/api/bond-bus/emit`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type, source: opts.nodeId, payload: payload ?? null }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { eventId?: string };
      return data.eventId ?? null;
    } catch {
      return null;
    }
  }

  /** Fetch recent event history */
  async function history(limit = 50, type?: string): Promise<BondBusEvent[]> {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (type) params.set("type", type);
      const res = await fetch(`${hubUrl}/api/bond-bus/history?${params}`, { headers });
      if (!res.ok) return [];
      const data = (await res.json()) as { events?: BondBusEvent[] };
      return data.events ?? [];
    } catch {
      return [];
    }
  }

  /** Close SSE connection */
  function disconnect(): void {
    eventSource?.close();
    eventSource = null;
  }

  return { register, connect, on, emit, history, disconnect, get isRegistered() { return registered; } };
}

// ─── Standard BOND Bus event types ─────────────────────────────────────────
export const BOND_BUS_EVENTS = {
  // BOND_OS
  COMPILATION_STARTED:   "compilation:started",
  COMPILATION_DONE:      "compilation:done",
  COMPILATION_FAILED:    "compilation:failed",
  MISSION_SWITCHED:      "mission:switched",
  UNREAL_CONNECTED:      "unreal:connected",
  UNREAL_DISCONNECTED:   "unreal:disconnected",
  // WealthPilot
  TRADE_EXECUTED:        "trade:executed",
  TRADE_PLAN_CREATED:    "trade:plan_created",
  CASHFLOW_UPDATED:      "cashflow:updated",
  // ConvergeVerse
  CHAPTER_GENERATED:     "chapter:generated",
  MANGA_PIPELINE_DONE:   "manga:pipeline_done",
  // BOND FORGE / BOND-VISION
  SCENE_SAVED:           "scene:saved",
  SCENE_LOADED:          "scene:loaded",
  // Bond Studios
  CONCIERGE_QUERY:       "concierge:query",
  // Universal
  AI_RESPONSE:           "ai:response",
  USER_ACTION:           "user:action",
  ERROR_CRITICAL:        "error:critical",
} as const;
