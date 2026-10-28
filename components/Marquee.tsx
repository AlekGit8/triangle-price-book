"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface MarqueeProps {
  /** Content of ONE copy; rendered three times for the seamless loop. */
  children: ReactNode;
  /** Accessible label for the scrollable region. */
  ariaLabel: string;
  /** How long one full copy takes to drift past (ms). Default 150_000. */
  durationMs?: number;
  /** Extra classes on the scroll container (e.g. mt-6, -mx-4 for full-bleed). */
  className?: string;
  /** Classes on each copy wrapper (flex row, gap, trailing padding). */
  copyClassName?: string;
}

/**
 * A horizontally scrolling row that also drifts on its own.
 *
 * Three identical copies tile the row; the viewport lives in the middle
 * copy and the scroll position wraps by one copy width, so the row loops
 * seamlessly in both directions and the user can swipe (touch) or drag
 * (mouse) through it manually. A slow auto-advance keeps the ticker feel
 * and pauses while the user interacts, resuming ~2.5s after they stop.
 * Auto-advance applies whole pixels only: some browsers (notably iOS
 * Safari) drop sub-pixel scrollLeft assignments, so adding <1px per
 * frame would never move.
 */
export default function Marquee({
  children,
  ariaLabel,
  durationMs = 150_000,
  className = "",
  copyClassName = "flex shrink-0 gap-4 pr-4",
}: MarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const copyWidthRef = useRef(0);
  const advanceRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ startX: number; lastX: number } | null>(null);
  const draggedRef = useRef(false);
  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;

  function pauseAuto() {
    pausedRef.current = true;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }

  function scheduleResume() {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
      resumeTimerRef.current = null;
    }, 2500);
  }

  useEffect(() => {
    const container = containerRef.current;
    const copy = copyRef.current;
    if (!container || !copy) return;
    // Explicitly non-null aliases: TS does not carry the guard's narrowing
    // into the nested callbacks below.
    const scroller: HTMLDivElement = container;
    const firstCopy: HTMLDivElement = copy;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function measure() {
      const w = firstCopy.offsetWidth;
      if (w) copyWidthRef.current = w;
      return copyWidthRef.current;
    }
    // Start in the middle copy so both directions have room to scroll.
    if (measure()) scroller.scrollLeft = copyWidthRef.current;

    // Keep the viewport in the middle copy: crossing either boundary wraps
    // by one copy width to the identical position in the next copy.
    function normalize() {
      const w = copyWidthRef.current;
      if (!w) return;
      if (scroller.scrollLeft >= 2 * w) scroller.scrollLeft -= w;
      else if (scroller.scrollLeft < w) scroller.scrollLeft += w;
    }
    scroller.addEventListener("scroll", normalize, { passive: true });

    // Re-measure when the copy's width changes (content, breakpoint).
    const ro = new ResizeObserver(() => {
      const w = measure();
      if (!w) return;
      scroller.scrollLeft = w + (((scroller.scrollLeft - w) % w) + w) % w;
    });
    ro.observe(firstCopy);

    let raf = 0;
    let last = performance.now();
    let ticking = false;
    // The rAF loop only runs while the marquee is on screen and the tab
    // is visible (P3): an off-screen ticker scrolling 60×/s burns CPU
    // for nothing. The IntersectionObserver + visibilitychange restart
    // it when the marquee comes back into view.
    let inView = true;
    function tick(now: number) {
      const dt = Math.min(now - last, 100);
      last = now;
      if (!reduced && !pausedRef.current) {
        let w = copyWidthRef.current;
        if (!w) w = measure();
        if (w) {
          advanceRef.current += (w / durationRef.current) * dt;
          const whole = Math.floor(advanceRef.current);
          if (whole > 0) {
            advanceRef.current -= whole;
            scroller.scrollLeft += whole;
            if (scroller.scrollLeft >= 2 * w) scroller.scrollLeft -= w;
          }
        }
      }
      if (inView && !document.hidden) {
        raf = requestAnimationFrame(tick);
      } else {
        ticking = false;
      }
    }
    function startTicking() {
      if (ticking) return;
      ticking = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    const io = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      if (inView && !document.hidden) startTicking();
    });
    io.observe(scroller);
    const onVis = () => {
      if (!document.hidden && inView) startTicking();
    };
    document.addEventListener("visibilitychange", onVis);
    startTicking();

    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", normalize);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };
    // Mount-only: ResizeObserver handles content/breakpoint changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={`report-marquee marquee-mask ${className}`}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        pauseAuto();
        if (e.pointerType === "mouse") {
          dragRef.current = { startX: e.clientX, lastX: e.clientX };
          draggedRef.current = false;
          containerRef.current?.setPointerCapture(e.pointerId);
          containerRef.current?.classList.add("dragging");
        }
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        if (!drag || e.pointerType !== "mouse" || !containerRef.current) return;
        const dx = e.clientX - drag.lastX;
        drag.lastX = e.clientX;
        if (Math.abs(e.clientX - drag.startX) > 6) draggedRef.current = true;
        containerRef.current.scrollLeft -= dx;
      }}
      onPointerUp={(e) => {
        if (dragRef.current) {
          dragRef.current = null;
          containerRef.current?.classList.remove("dragging");
          try {
            containerRef.current?.releasePointerCapture(e.pointerId);
          } catch {
            // Pointer was never captured; ignore.
          }
        }
        scheduleResume();
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        containerRef.current?.classList.remove("dragging");
        scheduleResume();
      }}
      onClickCapture={(e) => {
        // A drag that ends on a card must not open the card.
        if (draggedRef.current) {
          e.preventDefault();
          draggedRef.current = false;
        }
      }}
      onTouchStart={() => pauseAuto()}
      onTouchEnd={() => scheduleResume()}
      onWheel={() => {
        pauseAuto();
        scheduleResume();
      }}
      onMouseEnter={() => pauseAuto()}
      onMouseLeave={() => {
        dragRef.current = null;
        containerRef.current?.classList.remove("dragging");
        scheduleResume();
      }}
    >
      <div className="flex w-max">
        {[0, 1, 2].map((half) => (
          <div
            key={half}
            ref={half === 0 ? copyRef : undefined}
            aria-hidden={half !== 0}
            className={copyClassName}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
