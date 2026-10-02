"use client";

// Scroll-reveal primitives.
//
// `useInView` wraps IntersectionObserver with a one-shot trigger and a
// `prefers-reduced-motion` short-circuit, so callers never animate for users
// who opted out. `Reveal` is a thin, dependency-free wrapper that fades and
// slides its children into place exactly once (and simply shows content when
// motion is reduced).

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

/** Reads the OS-level reduced-motion preference, reactively. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export type UseInViewOptions = {
  /** Observer root margin. Defaults to a small bottom inset for a natural trigger. */
  rootMargin?: string;
  /** Visible ratio required to trigger. */
  threshold?: number;
};

/**
 * One-shot IntersectionObserver.
 *
 * Returns a ref to attach and whether the element has entered the viewport.
 * When the user prefers reduced motion (or the browser lacks
 * IntersectionObserver) it reports `true` immediately so content is visible
 * without any animation.
 */
export function useInView<T extends Element = HTMLDivElement>(
  options: UseInViewOptions = {},
): { ref: React.RefObject<T | null>; inView: boolean } {
  const { rootMargin = "0px 0px -12% 0px", threshold = 0.15 } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, rootMargin, threshold]);

  return { ref, inView };
}

export type RevealProps = {
  children: ReactNode;
  /** Stagger offset in milliseconds. */
  delay?: number;
  /** Initial vertical offset in pixels before the reveal. */
  y?: number;
  /** Element/component to render as. Defaults to `div`. */
  as?: ElementType;
  className?: string;
};

/**
 * Reveal: fades and slides its children into view once, when they enter the
 * viewport. Honours `prefers-reduced-motion` by rendering content with no
 * transition at all.
 */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  as,
  className = "",
}: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>();
  const reduced = usePrefersReducedMotion();
  const hidden = !reduced && !inView;
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? `translate3d(0, ${y}px, 0)` : "translate3d(0, 0, 0)",
        transition: reduced
          ? undefined
          : `opacity var(--dur-slow) var(--ease-out-soft) ${delay}ms, transform var(--dur-slow) var(--ease-out-soft) ${delay}ms`,
        willChange: hidden ? "opacity, transform" : undefined,
      }}
    >
      {children}
    </Tag>
  );
}
