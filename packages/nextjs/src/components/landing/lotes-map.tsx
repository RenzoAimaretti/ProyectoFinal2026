"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  CAMPAIGN_MONTHS,
  LOTS,
  LOT_STATUS,
  PLATES,
} from "./content";
import { useInView, useReducedMotion } from "./hooks";
import { Placa } from "./placa";
import { Reveal, SectionHead, Stamp } from "./primitives";
import { LotsSvg } from "./lots-svg";

const AUTO_STEP = 1250;
const FLASH_MS = 900;

export function LotesMap() {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.35,
    once: true,
  });

  const [month, setMonth] = useState(0);
  const [flash, setFlash] = useState<string[]>([]);
  const monthRef = useRef(0);
  const autoStarted = useRef(false);
  const autoTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const stopAuto = useCallback(() => {
    if (autoTimer.current) {
      window.clearInterval(autoTimer.current);
      autoTimer.current = null;
    }
  }, []);

  const selectMonth = useCallback(
    (next: number) => {
      const current = monthRef.current;
      if (next === current) return;

      const changed = LOTS.filter(
        (lot) =>
          CAMPAIGN_MONTHS[current].statuses[Number(lot.id) - 1] !==
          CAMPAIGN_MONTHS[next].statuses[Number(lot.id) - 1],
      ).map((lot) => lot.id);

      monthRef.current = next;
      setMonth(next);

      if (!reduced && changed.length > 0) {
        setFlash(changed);
        if (flashTimer.current) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash([]), FLASH_MS);
      }
    },
    [reduced],
  );

  useEffect(() => {
    if (!inView || reduced || autoStarted.current) return;

    autoStarted.current = true;
    let index = monthRef.current;

    autoTimer.current = window.setInterval(() => {
      index += 1;
      if (index >= CAMPAIGN_MONTHS.length) {
        stopAuto();
        return;
      }
      selectMonth(index);
    }, AUTO_STEP);

    return stopAuto;
  }, [inView, reduced, selectMonth, stopAuto]);

  useEffect(
    () => () => {
      stopAuto();
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    },
    [stopAuto],
  );

  const pickMonth = (next: number) => {
    stopAuto();
    selectMonth(next);
  };

  const onMonthKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let next: number | null = null;
    const last = CAMPAIGN_MONTHS.length - 1;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = index === 0 ? last : index - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    }

    if (next === null) return;
    event.preventDefault();
    pickMonth(next);
    buttonsRef.current[next]?.focus();
  };

  const active = CAMPAIGN_MONTHS[month];

  return (
    <section
      id="lotes"
      aria-labelledby="t-lotes"
      className="alm-wrap alm-sec"
    >
      <SectionHead
        id="t-lotes"
        title="La campaña, mes por mes, sobre el mapa"
        lead="Cada lote cambia de color a medida que se registran labores. Elegí un mes para ver cómo quedó el campo."
      />

      <div className="alm-lotes-grid">
        <Reveal className="alm-visor-wrap">
          <div className="alm-visor" ref={ref}>
            <div className="alm-visor-h">
              <span className="alm-k">
                Visor de la campaña · La Esperanza
              </span>
              <Stamp rotate={-2}>Ejemplo</Stamp>
            </div>

            <LotsSvg statuses={active.statuses} flash={flash} />

            <div className="alm-legend" aria-label="Estados de los lotes">
              {LOT_STATUS.map((label, index) => (
                <span key={label}>
                  <i
                    className={`alm-swatch alm-swatch--s${index}`}
                    aria-hidden="true"
                  />
                  {label}
                </span>
              ))}
            </div>

            <div className="alm-months" role="group" aria-label="Meses de la campaña">
              {CAMPAIGN_MONTHS.map((item, index) => (
                <button
                  key={item.short}
                  ref={(node) => {
                    buttonsRef.current[index] = node;
                  }}
                  type="button"
                  className={[
                    index === month ? "is-on" : "",
                    index < month ? "is-past" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={index === month}
                  aria-label={`${item.short}. ${item.title}`}
                  onClick={() => pickMonth(index)}
                  onKeyDown={(event) => onMonthKeyDown(event, index)}
                >
                  {item.short}
                </button>
              ))}
            </div>

            <div className="alm-mcap" aria-live="polite" aria-atomic="true">
              <div key={month} className="alm-fade">
                <h3>{active.title}</h3>
                <p>{active.text}</p>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="alm-lotes-plate">
          <Placa {...PLATES.map} />
        </div>
      </div>
    </section>
  );
}
