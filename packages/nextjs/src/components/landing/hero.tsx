import Link from "next/link";
import { CloudOfflineIcon } from "@/components/ui/icons";
import { WHATSAPP_URL } from "@/lib/contact";
import {
  HERO_LEDE,
  HERO_TITLE,
  HERO_WORDS,
  PLATES,
  TRACE,
  TRACE_DATA,
} from "./content";
import { Placa } from "./placa";
import { DemoLink, Slash, Stamp } from "./primitives";
import { WhatsAppIcon } from "./icons";
import type { CSSProperties } from "react";

export function Hero() {
  return (
    <section
      id="campania"
      aria-labelledby="t-campania"
      className="alm-wrap alm-hero"
    >
      <div className="alm-hero-copy">
        <p className="alm-eyebrow">Campaña 2025/26 · Registro de ejemplo</p>

        <h1 id="t-campania" className="alm-hero-title" aria-label={HERO_TITLE}>
          {HERO_WORDS.map((word, index) => (
            <span key={`${word}-${index}`}>
              <span
                className="alm-word"
                style={{ "--word-i": index } as CSSProperties}
              >
                {word}
              </span>{" "}
            </span>
          ))}
        </h1>

        <p className="alm-hero-lede">{HERO_LEDE}</p>

        <DemoLink className="alm-hero-demo" />

        <div className="alm-under-links">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="alm-under-link"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Hablar por WhatsApp
          </a>
          <Link href="/login" className="alm-linkline">
            Iniciar sesión
          </Link>
        </div>

        <ol className="alm-almanac" aria-label="Recorrido de un parte, ejemplo">
          {TRACE.map((entry, index) => (
            <li
              key={entry.title}
              className="alm-entry"
              style={{ "--entry-i": index } as CSSProperties}
            >
              <time className="alm-entry-date alm-num">{entry.date}</time>
              <div>
                <div className="alm-entry-tag">
                  <span className="alm-k">{entry.stage}</span>
                  <Stamp
                    tone={entry.tone}
                    rotate={entry.rotate}
                    motion="load"
                    delay={entry.delay}
                  >
                    {entry.stamp}
                  </Stamp>
                </div>
                <h3 className="alm-entry-title">{entry.title}</h3>
                <p className="alm-entry-meta">{entry.detail}</p>
                {entry.note ? (
                  <p className="alm-entry-note">
                    <Slash />
                    {entry.note}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <aside className="alm-hero-aside">
        <Placa {...PLATES.hero} eager priority />

        <dl className="alm-trace">
          <dt className="alm-k">Trazabilidad de punta a punta</dt>
          {TRACE_DATA.map((row) => (
            <div className="alm-trace-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>

        <p className="alm-trace-note">
          <CloudOfflineIcon className="h-4 w-4" />
          Capturado en el lote sin conexión y sincronizado al recuperar señal.
        </p>
      </aside>
    </section>
  );
}
