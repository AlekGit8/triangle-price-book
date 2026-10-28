"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * First-party anonymous analytics beacon (Oct 25, 2026).
 * - No cookies, no IP tracking, no cross-site anything. A random
 *   session id lives in sessionStorage (forgotten when the tab closes).
 * - Sends one "view" event per page, then a heartbeat every 30s while
 *   the tab is visible, reporting active seconds on the page. The
 *   final heartbeat goes out on pagehide / when the tab is hidden.
 * - Skips /admin (the admin's own visits aren't traffic), and honors
 *   Do Not Track.
 */

const HEARTBEAT_MS = 30_000;
const SESSION_KEY = "tpb-session";

// Fallback when storage is blocked: the session id lives only in memory
// for this page load, so analytics still works — the session just isn't
// shared across page loads.
let memorySessionId: string | null = null;

function newSessionId(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the manual fallback
  }
  return `tpb-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = newSessionId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Some in-app browsers (notably Threads) throw a SecurityError on
    // sessionStorage access instead of returning null. The beacon must
    // never take the page down, so fall back to an in-memory id.
    if (!memorySessionId) memorySessionId = newSessionId();
    return memorySessionId;
  }
}

export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const viewIdRef = useRef<string | null>(null);
  const activeSecondsRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (navigator.doNotTrack === "1") return;
    if (pathname.startsWith("/admin")) return;

    const sessionId = getSessionId();
    let referrerHost: string | null = null;
    try {
      if (document.referrer) referrerHost = new URL(document.referrer).hostname;
    } catch {
      referrerHost = null;
    }
    const webdriver =
      (navigator as unknown as { webdriver?: boolean }).webdriver === true;

    const send = (body: Record<string, unknown>, beacon = false) => {
      const payload = JSON.stringify(body);
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/analytics/event",
          new Blob([payload], { type: "application/json" })
        );
        return Promise.resolve(undefined);
      }
      return fetch("/api/analytics/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    };

    const heartbeat = (beacon = false) => {
      if (!viewIdRef.current) return;
      void send(
        {
          type: "heartbeat",
          session_id: sessionId,
          view_id: viewIdRef.current,
          active_seconds: activeSecondsRef.current,
        },
        beacon
      );
    };

    const stopTimers = () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };

    const startTimers = () => {
      stopTimers();
      tickRef.current = window.setInterval(() => {
        activeSecondsRef.current += 1;
      }, 1000);
      timerRef.current = window.setInterval(() => heartbeat(false), HEARTBEAT_MS);
    };

    // New page view.
    activeSecondsRef.current = 0;
    viewIdRef.current = null;
    stopTimers();
    // If the user navigates before this view's response lands, the old
    // response must not overwrite the new page's view id (it would send
    // heartbeats against the wrong row and the new view would never get
    // a duration). The cleanup below flips `cancelled` for this effect
    // run, and stale responses are ignored.
    let cancelled = false;
    void send({
      type: "view",
      session_id: sessionId,
      path: pathname,
      referrer_host: referrerHost,
      webdriver,
    }).then(async (res) => {
      try {
        const json = (await (res as unknown as Response)?.json?.()) as
          | { view_id?: string }
          | undefined;
        if (!cancelled && json?.view_id) viewIdRef.current = json.view_id;
      } catch {
        // View recorded without an id — heartbeats just no-op.
      }
    });
    if (document.visibilityState === "visible") startTimers();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        heartbeat(true); // flush active seconds before the tab sleeps
        stopTimers();
      } else {
        startTimers();
      }
    };
    const onHide = () => heartbeat(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      cancelled = true;
      heartbeat(true); // final flush on SPA navigation / unmount
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      stopTimers();
    };
  }, [pathname]);

  return null;
}
