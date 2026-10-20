"use client";

import { STATS } from "./content";
import { useCountUp, useInView, useReducedMotion } from "./hooks";

const NUMBER = new Intl.NumberFormat("es-AR");

function Figure({
  value,
  label,
  active,
  reduced,
}: {
  value: number;
  label: string;
  active: boolean;
  reduced: boolean;
}) {
  const current = useCountUp(value, active, reduced);

  return (
    <div className="alm-fig">
      <b aria-hidden="true">{NUMBER.format(current)}</b>
      <span className="sr-only">
        {NUMBER.format(value)} {label}. Cifra de ejemplo.
      </span>
      <span className="alm-fig-label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

export function Stats() {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.35,
    once: true,
  });

  return (
    <section className="alm-wrap alm-figures" aria-label="Cifras de ejemplo">
      <div ref={ref} className="alm-figs">
        {STATS.map((stat) => (
          <Figure
            key={stat.label}
            value={stat.value}
            label={stat.label}
            active={inView}
            reduced={reduced}
          />
        ))}
      </div>
      <p className="alm-fig-note">
        Cifras de ejemplo para este prototipo. Reemplazar por datos reales.
      </p>
    </section>
  );
}
