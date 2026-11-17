"use client";

import { createElement, type CSSProperties, type ReactNode } from "react";
import { ArrowRightIcon } from "@/components/ui/icons";
import Link from "next/link";
import type { StampTone } from "./content";
import { useInView, useReveal } from "./hooks";

/* ------------------------------------------------------------------ */
/* Reveal                                                              */
/* ------------------------------------------------------------------ */

type RevealTag =
  | "div"
  | "section"
  | "article"
  | "aside"
  | "header"
  | "figure"
  | "ul"
  | "ol"
  | "li";

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
  /** Children reveal in sequence instead of the box itself. */
  stagger?: boolean;
  /** Extra delay for the one-shot reveal. */
  delay?: number;
};

export function Reveal({
  children,
  className = "",
  as = "div",
  stagger = false,
  delay = 0,
}: RevealProps) {
  const { ref, shown } = useReveal<HTMLElement>();
  const classes = [
    "alm-reveal",
    stagger ? "alm-stagger" : "",
    shown ? "in" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return createElement(
    as,
    {
      ref,
      className: classes,
      style:
        delay > 0
          ? ({ "--alm-delay": `${delay}ms` } as CSSProperties)
          : undefined,
    },
    children,
  );
}

/* ------------------------------------------------------------------ */
/* Stamp                                                               */
/* ------------------------------------------------------------------ */

type StampMotion = "none" | "load" | "view" | "key";

type StampProps = {
  children: ReactNode;
  tone?: StampTone;
  rotate?: number;
  motion?: StampMotion;
  /** Delay in ms, only used by `motion="load"`. */
  delay?: number;
  className?: string;
};

export function Stamp({
  children,
  tone = "red",
  rotate = -2,
  motion = "none",
  delay = 0,
  className = "",
}: StampProps) {
  const { ref, inView } = useInView<HTMLSpanElement>({
    threshold: 0.4,
    once: true,
  });

  const classes = ["alm-stamp", `alm-stamp--${tone}`];
  if (motion === "load") classes.push("alm-stamp--load");
  if (motion === "key") classes.push("alm-stamp--animate");
  if (motion === "view" && inView) classes.push("is-stamped");
  if (className) classes.push(className);

  return (
    <span
      ref={motion === "view" ? ref : undefined}
      data-stamp={motion === "view" ? "" : undefined}
      className={classes.join(" ")}
      style={
        {
          "--stamp-rot": `${rotate}deg`,
          "--stamp-delay": `${delay}ms`,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Small editorial pieces                                              */
/* ------------------------------------------------------------------ */

export function Slash({ className = "" }: { className?: string }) {
  return <span className={`alm-slash ${className}`.trim()} aria-hidden="true" />;
}

export function SectionHead({
  id,
  title,
  lead,
}: {
  id: string;
  title: string;
  lead: string;
}) {
  return (
    <Reveal className="alm-sec-head">
      <h2 id={id}>{title}</h2>
      <p>{lead}</p>
    </Reveal>
  );
}

export function DemoLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/demo" className={`alm-demo-link ${className}`.trim()}>
      <span className="alm-demo-title">
        <span className="alm-demo-plus" aria-hidden="true">
          +
        </span>
        Ver el demo
      </span>
      <span className="alm-demo-hint">
        Datos de ejemplo · sin cuenta
        <ArrowRightIcon className="alm-demo-arrow h-4 w-4" />
      </span>
    </Link>
  );
}
