"use client";

import { useState } from "react";

/**
 * "Use this pass in this browser" — restores a day pass from its
 * bookmark link by setting the tpb_reveals cookie server-side.
 */
export default function RevealPassActivator({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function activate() {
    setState("busy");
    try {
      const res = await fetch("/api/reveal/activate-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("restore failed");
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="mt-3 text-sm font-semibold text-ink">
        Pass active in this browser — verified listings now show business names.{" "}
        <a href="/browse" className="underline underline-offset-4">
          Browse prices →
        </a>
      </p>
    );
  }
  return (
    <div className="mt-4">
      <button
        onClick={activate}
        disabled={state === "busy"}
        className="rounded-[10px] bg-black px-4 py-2.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {state === "busy" ? "…" : "Use this pass in this browser"}
      </button>
      {state === "error" && (
        <p className="mt-2 text-sm text-red-700">Could not restore this pass. Please try again.</p>
      )}
    </div>
  );
}
