"use client";

import Link from "next/link";
import { useFloatingDemo } from "./hooks";

export function FloatingDemo() {
  const visible = useFloatingDemo("campania", "cierre");

  return (
    <Link
      href="/demo"
      className={`alm-fab ${visible ? "is-visible" : ""}`.trim()}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      aria-label="Ver el demo con datos de ejemplo, sin cuenta"
    >
      <span aria-hidden="true">+</span>
      Ver el demo
    </Link>
  );
}
