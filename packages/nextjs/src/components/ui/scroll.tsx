"use client";

// Scroll-driven primitives.
//
// Everything here is dependency-free and rAF-throttled. Hooks that must not
// re-render the page tree (parallax) write transforms straight to the DOM via
// refs; stateful hooks only update when their derived value actually changes.

import { useEffect, useRef, useState, type RefObject } from "react";
import { useInView, usePrefersReducedMotion } from "./reveal";

/* ------------------------------------------------------------------ */
/* Page scroll position                                                */
/* ------------------------------------------------------------------ */

/** Raw scroll offset in pixels, throttled with requestAnimationFrame. */
export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrollY(window.scrollY);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return scrollY;
}

/** Fraction of the page scrolled, clamped to 0..1. */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return progress;
}

/**
 * True once the page has scrolled past `threshold` pixels.
 * State only flips when the boolean changes, so this does not re-render on
 * every scroll frame.
 */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [threshold]);

  return scrolled;
}

/* ------------------------------------------------------------------ */
/* Parallax                                                            */
/* ------------------------------------------------------------------ */

export type ParallaxOptions = {
  /** Horizontal travel in px per scrolled px (negative moves opposite). */
  x?: number;
  /** Vertical travel in px per scrolled px. */
  y?: number;
  /** Cap on the absolute translate, in px. */
  max?: number;
  /** Total scale reduction across the capped travel (0 disables scaling). */
  scale?: number;
  /** Skip the effect entirely (e.g. under reduced motion). */
  disabled?: boolean;
};

/**
 * Applies a scroll-driven transform directly to a ref'd element.
 * The transform is written to the DOM inside a rAF callback, so scrolling
 * never triggers a React re-render. Disabled (and cleaned up) under reduced
 * motion by passing `disabled: true`.
 */
export function useParallax<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { x = 0, y = 0, max = 80, scale = 0, disabled = false }: ParallaxOptions = {},
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    el.style.willChange = "transform";
    let frame = 0;

    const update = () => {
      frame = 0;
      const sy = window.scrollY;
      const ty = Math.max(-max, Math.min(max, sy * y));
      const tx = Math.max(-max, Math.min(max, sy * x));
      const sc =
        scale > 0 ? 1 - Math.min(scale, (Math.abs(ty) / max) * scale) : 1;
      el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el.style.transform = "";
      el.style.willChange = "";
    };
  }, [ref, x, y, max, scale, disabled]);
}

/* ------------------------------------------------------------------ */
/* Count-up                                                            */
/* ------------------------------------------------------------------ */

export type CountUpProps = {
  /** Target integer value. */
  value: number;
  /** Animation duration in milliseconds. */
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

/**
 * CountUp: animates from 0 to `value` the first time it enters the viewport.
 * Renders the final value immediately under reduced motion.
 */
export function CountUp({
  value,
  duration = 1400,
  prefix = "",
  suffix = "",
  className = "",
}: CountUpProps) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    if (!inView) return;

    let frame = 0;
    let start: number | null = null;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      setDisplay(value * easeOut(t));
      if (t < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [inView, reduced, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {Math.round(display)}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll progress bar                                                 */
/* ------------------------------------------------------------------ */

/**
 * Thin brand-gradient bar pinned to the very top of the viewport that tracks
 * page scroll. Self-contained so its per-frame updates never re-render the
 * page around it.
 */
export function ScrollProgress({ className = "" }: { className?: string }) {
  const progress = useScrollProgress();
  const reduced = usePrefersReducedMotion();

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] ${className}`}
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-agro-green via-agro-olive to-agro-wheat"
        style={{
          transform: `scaleX(${progress.toFixed(4)})`,
          transition: reduced ? undefined : "transform 90ms linear",
        }}
      />
    </div>
  );
}
