"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

/**
 * Media query as an external store. The server snapshot keeps the markup
 * stable; the client snapshot is applied on the first hydration pass, so
 * reduced-motion users never see a loop start and then stop.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") return () => {};
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/* ------------------------------------------------------------------ */
/* Visibility                                                          */
/* ------------------------------------------------------------------ */

type UseInViewOptions = {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
};

export function useInView<T extends HTMLElement = HTMLElement>(
  options: UseInViewOptions = {},
) {
  const { threshold = 0.12, rootMargin = "0px 0px -8% 0px", once = true } =
    options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      const fallback = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(fallback);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return { ref, inView };
}

/** One-shot reveal used by the `Reveal` primitive. */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const { ref, inView } = useInView<T>({
    threshold: 0.08,
    rootMargin: "0px 0px -8% 0px",
    once: true,
  });
  return { ref, shown: inView };
}

export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      const next = window.scrollY > threshold;
      setScrolled((current) => (current === next ? current : next));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return scrolled;
}

/* ------------------------------------------------------------------ */
/* Scroll-driven values                                                */
/* ------------------------------------------------------------------ */

/**
 * Progress of a tall section past its sticky panel, from 0 to 1.
 * Measured against the panel's computed sticky top so it works with the
 * fixed header and with safe-area insets.
 */
export function useScrollProgress(
  sectionRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  options: { disabled?: boolean } = {},
): number {
  const { disabled = false } = options;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (disabled) return;

    const section = sectionRef.current;
    const panel = panelRef.current;
    if (!section || !panel) return;

    let frame = 0;
    let last = -1;
    let stickyTop = 0;

    const measure = () => {
      stickyTop = Number.parseFloat(getComputedStyle(panel).top) || 0;
    };

    const update = () => {
      frame = 0;
      const total = section.offsetHeight - panel.offsetHeight;
      const next =
        total > 0
          ? Math.min(
              1,
              Math.max(
                0,
                (stickyTop - section.getBoundingClientRect().top) / total,
              ),
            )
          : 0;

      if (Math.abs(next - last) > 0.004) {
        last = next;
        setProgress(next);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      schedule();
    };

    measure();
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
    };
  }, [disabled, panelRef, sectionRef]);

  return disabled ? 0 : progress;
}

/** Subtle plate parallax. Allocation-free: writes one CSS custom property. */
export function useParallax<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: { strength?: number; disabled?: boolean } = {},
) {
  const { strength = 0.14, disabled = false } = options;

  useEffect(() => {
    const node = ref.current;
    if (!node || disabled) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      if (rect.bottom < -160 || rect.top > window.innerHeight + 160) return;

      const center = rect.top + rect.height / 2;
      const offset = Math.max(
        -0.7,
        Math.min(0.7, (center - window.innerHeight / 2) / window.innerHeight),
      );
      node.style.setProperty(
        "--alm-par-y",
        `${(-offset * rect.height * strength).toFixed(1)}px`,
      );
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [disabled, ref, strength]);
}

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

/** Counts from zero to `target` the first time `active` is true. */
export function useCountUp(
  target: number,
  active: boolean,
  disabled = false,
  duration = 1400,
): number {
  const [value, setValue] = useState(target);
  const started = useRef(false);

  useEffect(() => {
    if (disabled || !active || started.current) return;

    started.current = true;
    let frame = 0;
    const start = performance.now();

    setValue(0);
    const tick = (now: number) => {
      const time = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - time, 3);
      setValue(Math.round(target * eased));
      if (time < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [active, disabled, duration, target]);

  return disabled ? target : value;
}

/* ------------------------------------------------------------------ */
/* Floating demo                                                       */
/* ------------------------------------------------------------------ */

export function useFloatingDemo(heroId: string, ctaId: string): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const cta = document.getElementById(ctaId);
    if (!hero || !cta) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const next =
        hero.getBoundingClientRect().bottom < 0 &&
        cta.getBoundingClientRect().top > window.innerHeight * 0.72;
      setVisible((current) => (current === next ? current : next));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ctaId, heroId]);

  return visible;
}
