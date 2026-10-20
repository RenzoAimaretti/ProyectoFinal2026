"use client";

import { useRef } from "react";
import {
  NARRATIVE_FIELDS,
  NARRATIVE_INSUMOS,
  NARRATIVE_STAGES,
  NARRATIVE_STEPS,
} from "./content";
import { useReducedMotion, useScrollProgress } from "./hooks";
import { Slash, Stamp } from "./primitives";

export function NarrativeParte() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const progress = useScrollProgress(sectionRef, panelRef, {
    disabled: reduced,
  });
  const stage = reduced ? 2 : progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2;
  const current = NARRATIVE_STAGES[stage];
  const percent = reduced ? 100 : Math.round(progress * 100);

  return (
    <section
      ref={sectionRef}
      id="recorrido"
      aria-labelledby="t-recorrido"
      className={`alm-narr ${reduced ? "is-static" : ""}`.trim()}
    >
      <div ref={panelRef} className="alm-narr-pin">
        <div className="alm-wrap alm-narr-grid">
          <div className="alm-narr-copy">
            <p className="alm-eyebrow">El recorrido de un parte</p>
            <h2 id="t-recorrido">De la tranquera al tablero en tres pasos</h2>

            <ol className="alm-steps">
              {NARRATIVE_STEPS.map((step, index) => (
                <li
                  key={step.stage}
                  className={index === stage ? "is-on" : ""}
                  aria-current={index === stage ? "step" : undefined}
                >
                  <span className="alm-k">{step.stage}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div
              className="alm-pbar"
              role="progressbar"
              aria-label="Avance del recorrido"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <i style={{ width: `${percent}%` }} />
            </div>

            <p className="alm-hint">
              <svg
                width="12"
                height="16"
                viewBox="0 0 12 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 1v13M1 9l5 5 5-5" />
              </svg>
              Seguí bajando para recorrer el parte
            </p>
          </div>

          <article
            className={`alm-parte ${stage >= 1 ? "is-1" : ""} ${
              stage >= 2 ? "is-2" : ""
            }`.trim()}
            data-stage={stage}
          >
            <header className="alm-parte-h">
              <div>
                <p className="alm-k">Bitácora de campo</p>
                <h3>Parte diario PD-0001</h3>
              </div>
              <Stamp
                key={stage}
                tone={current.tone}
                rotate={current.rotate}
                motion="key"
              >
                {current.stamp}
              </Stamp>
            </header>

            <p className="alm-parte-note">
              <Slash />
              <span>{current.note}</span>
            </p>

            <dl className="alm-parte-grid">
              {NARRATIVE_FIELDS.map((field) => (
                <div key={field.label}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>

            <div className="alm-pins">
              <p className="alm-k">Insumos</p>
              <div className="alm-pins-stack">
                <p
                  className="alm-parte-wait"
                  aria-hidden={stage >= 1 || undefined}
                >
                  Pendiente de validación en la oficina.
                </p>
                <ul className="alm-parte-list" aria-hidden={stage < 1 || undefined}>
                  {NARRATIVE_INSUMOS.map((insumo) => (
                    <li key={insumo.code}>
                      <span>{insumo.name}</span>
                      <span>{insumo.code}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              className="alm-parte-rev"
              aria-hidden={stage < 2 || undefined}
            >
              <div>
                <div className="alm-parte-cert">
                  <span>Certificado visible en el panel del cliente</span>
                  <b>CERT-2026-0042</b>
                </div>
              </div>
            </div>

            <div className="alm-tline" aria-hidden="true">
              {NARRATIVE_STAGES.map((item, index) => (
                <div key={item.timeline} className={index <= stage ? "is-on" : ""}>
                  {item.timeline}
                </div>
              ))}
            </div>

            <p className="sr-only" aria-live="polite">
              {`Etapa ${stage + 1} de 3: ${NARRATIVE_STEPS[stage].stage}. ${current.note}`}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
