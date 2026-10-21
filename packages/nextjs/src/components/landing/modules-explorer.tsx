"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  CAMPAIGN_MONTHS,
  MODULES,
  PRODUCT_CAPTURES,
} from "./content";
import { useMediaQuery } from "./hooks";
import { LotsSvg } from "./lots-svg";
import { Reveal, SectionHead, Stamp } from "./primitives";

export function ModulesExplorer() {
  const [active, setActive] = useState(0);
  const hover = useMediaQuery("(hover: hover)");
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const activeModule = MODULES[active];

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let next: number | null = null;
    const last = MODULES.length - 1;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      next = index === 0 ? last : index - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    }

    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabsRef.current[next]?.focus();
  };

  return (
    <section
      id="modulos"
      aria-labelledby="t-modulos"
      className="alm-wrap alm-sec"
    >
      <SectionHead
        id="t-modulos"
        title="Un sistema, todas las labores del agro"
        lead="Cada módulo resuelve una parte concreta de la operación y comparte los mismos datos: lo que se carga en el campo llega a la oficina y al productor sin recargar nada."
      />

      <Reveal className="alm-mods">
        <div
          className="alm-mod-list"
          role="tablist"
          aria-label="Módulos"
          aria-orientation="vertical"
        >
          {MODULES.map((item, index) => (
            <button
              key={item.id}
              ref={(node) => {
                tabsRef.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`alm-module-tab-${item.id}`}
              aria-selected={index === active}
              aria-controls="alm-module-panel"
              tabIndex={index === active ? 0 : -1}
              className="alm-mod-btn"
              onClick={() => setActive(index)}
              onMouseEnter={() => {
                if (hover) setActive(index);
              }}
              onFocus={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span className="alm-mod-dash" aria-hidden="true" />
              {item.name}
              {item.soon ? (
                <Stamp
                  className="alm-mod-soon"
                  rotate={-3}
                  motion="none"
                >
                  En preparación
                </Stamp>
              ) : null}
            </button>
          ))}
        </div>

        <div
          className="alm-mod-view"
          role="tabpanel"
          id="alm-module-panel"
          aria-labelledby={`alm-module-tab-${activeModule.id}`}
          tabIndex={0}
        >
          <div className="alm-pane" key={activeModule.id}>
            <p className="alm-k">{activeModule.previewTitle}</p>
            <div className="alm-mod-view-head">
              <h3>{activeModule.name}</h3>
              {activeModule.soon ? (
                <Stamp rotate={-3} motion="none">
                  En preparación
                </Stamp>
              ) : null}
            </div>
            <p className="alm-mod-desc">{activeModule.description}</p>

            {activeModule.kind === "map" ? (
              <>
                <LotsSvg
                  statuses={CAMPAIGN_MONTHS[1].statuses}
                  compact
                  className="alm-mini-map"
                />
                <p className="alm-mini-note">
                  Estado de los lotes en octubre. Datos de ejemplo.
                </p>
              </>
            ) : (
              <>
                <ul className="alm-mini-rows">
                  {activeModule.rows?.map((row) => (
                    <li key={row.label}>
                      <div className="alm-mr-top">
                        <span>{row.label}</span>
                        <b>{row.value}</b>
                      </div>
                      {row.pct !== undefined ? (
                        <div className="alm-meter" aria-hidden="true">
                          <i
                            style={
                              { "--alm-bar": `${row.pct}%` } as CSSProperties
                            }
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="alm-mini-note">Datos de ejemplo.</p>
              </>
            )}
          </div>
        </div>
      </Reveal>

      <p className="sr-only" aria-live="polite">
        Vista previa: {activeModule.name}
      </p>

      <Reveal className="alm-captures" delay={120}>
        <p className="alm-k">Láminas del producto</p>
        <div className="alm-captures-grid">
          {PRODUCT_CAPTURES.map((capture) => (
            <figure className="alm-capture" key={capture.label}>
              <div className="alm-capture-slot">
                <span className="alm-k">Captura pendiente</span>
              </div>
              <figcaption>
                <span>{capture.label}</span>
                <span>{capture.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="alm-captures-note">
          Espacio reservado para capturas reales de la plataforma. No son
          imágenes generadas.
        </p>
      </Reveal>
    </section>
  );
}
