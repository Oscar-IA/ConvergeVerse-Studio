"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: "No session token received.",
  token_invalid: "Session token is invalid or expired.",
  invalid_central_url: "Invalid BOND Central URL.",
};

function BondAuthContent() {
  const params = useSearchParams();
  const central = params.get("central") ?? (process.env.NEXT_PUBLIC_BOND_CENTRAL_URL ?? "https://bond-central.vercel.app");
  const error = params.get("error");
  const redirect = params.get("redirect") ?? "/";
  const nexusUrl = `${central}/nexus/bond-convergeverse`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-12 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-md">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10">
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-cyan-400" aria-hidden>
              <path d="M12 3L3 8.5V15.5L12 21L21 15.5V8.5L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </div>
        </div>
        <h1 className="mb-1 font-mono text-xs uppercase tracking-[0.3em] text-cyan-400/80">ConvergeVerse</h1>
        <p className="mb-6 text-sm font-semibold text-white/70">Authentication required</p>
        {error && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            {ERROR_MESSAGES[error] ?? "An error occurred. Please try again."}
          </div>
        )}
        <p className="mb-6 text-xs leading-relaxed text-white/45">
          ConvergeVerse requires an active{" "}
          <span className="text-cyan-400">BOND Central</span> session. Open the app from the Nexus to authenticate.
        </p>
        <a
          href={`${nexusUrl}?redirect=${encodeURIComponent(redirect)}`}
          className="block w-full rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-400 transition-colors hover:bg-cyan-400/20"
        >
          Open in BOND Central
        </a>
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.25em] text-white/20">
          BOND Studios · Zero external storage
        </p>
      </div>
    </main>
  );
}

export default function BondAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <BondAuthContent />
    </Suspense>
  );
}
