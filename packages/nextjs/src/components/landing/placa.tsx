"use client";

import Image from "next/image";
import { useRef } from "react";
import type { PlateSpec } from "./content";
import {
  useParallax,
  useReducedMotion,
  useReveal,
} from "./hooks";

type PlacaProps = PlateSpec & {
  /** Reveal on page load instead of on scroll (hero plate). */
  eager?: boolean;
  /** Passed to next/image for the hero's LCP image. */
  priority?: boolean;
  parallax?: boolean;
  className?: string;
};

export function Placa({
  src,
  alt,
  index,
  caption,
  sizes,
  eager = false,
  priority = false,
  parallax = true,
  className = "",
}: PlacaProps) {
  const reduced = useReducedMotion();
  const { ref, shown } = useReveal<HTMLElement>();
  const mediaRef = useRef<HTMLDivElement>(null);

  useParallax(mediaRef, {
    strength: 0.14,
    disabled: reduced || !parallax,
  });

  const classes = [
    "alm-placa",
    eager ? "alm-placa--eager" : "",
    shown ? "is-revealed" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <figure ref={ref} className={classes}>
      <div className="alm-placa-media">
        <div className="alm-placa-par" ref={mediaRef}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className="alm-placa-img"
          />
        </div>
      </div>
      <figcaption>
        <b className="alm-placa-idx">{index}</b>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}
