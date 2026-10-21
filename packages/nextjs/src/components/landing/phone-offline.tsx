"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ClipboardIcon } from "@/components/ui/icons";
import {
  PHONE_FIELDS,
  PHONE_ITEMS,
  PHONE_POINTS,
  PHONE_TYPED_FIELDS,
  type StampTone,
} from "./content";
import { useInView, useReducedMotion } from "./hooks";
import { Reveal, SectionHead, Slash, Stamp } from "./primitives";
import { ReplayIcon } from "./icons";

type PhoneStamp = { text: string; tone: StampTone };
type FieldKey = (typeof PHONE_TYPED_FIELDS)[number]["key"];
type Fields = Record<FieldKey, string>;
type QueueItem = { code: string; detail: string; done: boolean };

const EMPTY_FIELDS: Fields = { lote: "", labor: "", ha: "", hs: "" };
const STATIC_FIELDS: Fields = {
  lote: "4 · Norte",
  labor: "Pulverización",
  ha: "48,5 ha",
  hs: "6,5 h",
};
const STATIC_ITEMS: QueueItem[] = PHONE_ITEMS.map((item) => ({
  ...item,
  done: false,
}));

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    let id = 0;
    const onAbort = () => {
      window.clearTimeout(id);
      resolve();
    };
    id = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function PhoneOffline() {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.35,
    once: false,
  });

  const [online, setOnline] = useState(false);
  const [stamp, setStamp] = useState<PhoneStamp>({
    text: "Sin señal",
    tone: "red",
  });
  const [fields, setFields] = useState<Fields>(STATIC_FIELDS);
  const [typing, setTyping] = useState<FieldKey | null>(null);
  const [items, setItems] = useState<QueueItem[]>(STATIC_ITEMS);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "Sin señal. Tres partes esperando en el dispositivo.",
  );
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const showStatic = () => {
      setOnline(false);
      setStamp({ text: "Sin señal", tone: "red" });
      setFields(STATIC_FIELDS);
      setTyping(null);
      setItems(STATIC_ITEMS);
      setSaved(false);
      setToast(false);
      setAnnouncement("Sin señal. Tres partes esperando en el dispositivo.");
    };

    if (reduced) {
      showStatic();
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const reset = () => {
      setOnline(true);
      setStamp({ text: "En línea", tone: "green" });
      setFields(EMPTY_FIELDS);
      setTyping(null);
      setItems([]);
      setSaved(false);
      setToast(false);
      setAnnouncement("En línea. Sin partes pendientes.");
    };

    const typeField = async (key: FieldKey, value: string) => {
      setTyping(key);
      for (let index = 1; index <= value.length; index += 1) {
        if (signal.aborted) return;
        setFields((current) => ({ ...current, [key]: value.slice(0, index) }));
        await sleep(32, signal);
      }
      setTyping(null);
    };

    const play = async () => {
      while (!signal.aborted) {
        reset();
        await sleep(1300, signal);
        if (signal.aborted) return;

        setOnline(false);
        setStamp({ text: "Sin señal", tone: "red" });
        setAnnouncement("Sin señal. El parte se guarda en el dispositivo.");
        await sleep(1000, signal);

        for (const field of PHONE_TYPED_FIELDS) {
          if (signal.aborted) return;
          await typeField(field.key, field.value);
          await sleep(190, signal);
        }

        await sleep(450, signal);
        if (signal.aborted) return;

        setSaved(true);
        setItems([{ ...PHONE_ITEMS[0], done: false }]);
        setAnnouncement("Parte guardado en el dispositivo. 1 parte pendiente.");
        await sleep(240, signal);
        setSaved(false);
        await sleep(780, signal);

        setFields(EMPTY_FIELDS);
        setItems((current) => [
          ...current,
          { ...PHONE_ITEMS[1], done: false },
        ]);
        setAnnouncement("Dos partes pendientes de sincronizar.");
        await sleep(800, signal);

        setItems((current) => [
          ...current,
          { ...PHONE_ITEMS[2], done: false },
        ]);
        setAnnouncement("Tres partes pendientes de sincronizar.");
        await sleep(1500, signal);
        if (signal.aborted) return;

        setOnline(true);
        setStamp({ text: "Sincronizando", tone: "amber" });
        setAnnouncement("Señal recuperada. Sincronizando tres partes.");
        await sleep(1000, signal);

        for (let index = 0; index < PHONE_ITEMS.length; index += 1) {
          if (signal.aborted) return;
          setItems((current) =>
            current.map((item, itemIndex) =>
              itemIndex <= index ? { ...item, done: true } : item,
            ),
          );
          setAnnouncement(`${index + 1} de 3 partes subidas.`);
          await sleep(650, signal);
        }

        setStamp({ text: "Sincronizado", tone: "green" });
        setToast(true);
        setAnnouncement("Todo sincronizado con la oficina.");
        await sleep(3600, signal);
        setToast(false);
        await sleep(600, signal);
      }
    };

    void play();

    return () => {
      controller.abort();
    };
  }, [inView, reduced, run]);

  const showFinal = () => {
    setOnline(true);
    setStamp({ text: "Sincronizado", tone: "green" });
    setFields(STATIC_FIELDS);
    setTyping(null);
    setItems(STATIC_ITEMS.map((item) => ({ ...item, done: true })));
    setSaved(false);
    setToast(true);
    setAnnouncement("Todo sincronizado con la oficina.");
  };

  const pending = items.filter((item) => !item.done).length;
  const countText =
    items.length === 0
      ? "Sin partes pendientes."
      : pending === 0
        ? "Todo sincronizado."
        : `${pending} ${pending === 1 ? "parte pendiente" : "partes pendientes"} de sincronizar.`;

  return (
    <section
      id="movil"
      aria-labelledby="t-movil"
      className="alm-wrap alm-sec"
    >
      <SectionHead
        id="t-movil"
        title="El móvil trabaja primero; la señal viene después"
        lead="La captura de datos en el lote no depende de la cobertura. La app guarda todo en el dispositivo y lo sincroniza de forma asíncrona cuando vuelve la conexión."
      />

      <div className="alm-movil-grid">
        <Reveal as="ul" stagger className="alm-mfeat">
          {PHONE_POINTS.map((point, index) => (
            <li key={point.title} style={{ "--i": index } as CSSProperties}>
              <Slash />
              <div>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </div>
            </li>
          ))}
        </Reveal>

        <Reveal className="alm-phone-wrap">
          <div
            ref={ref}
            className="alm-phone"
            aria-hidden="true"
            role="presentation"
          >
            <div className="alm-screen">
              <div className="alm-sbar">
                <span>9:41</span>
                <span className={`alm-signal ${online ? "" : "is-off"}`.trim()}>
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </div>

              <div className="alm-app">
                <div className="alm-app-head">
                  <div>
                    <p className="alm-k">Bitácora de campo</p>
                    <h4>Parte diario</h4>
                  </div>
                  <Stamp
                    key={stamp.text}
                    tone={stamp.tone}
                    rotate={-3}
                    motion="key"
                  >
                    {stamp.text}
                  </Stamp>
                </div>

                <dl className="alm-pf">
                  {PHONE_FIELDS.map((field) => (
                    <div key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                  {PHONE_TYPED_FIELDS.map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd className={typing === field.key ? "is-typing" : ""}>
                        {fields[field.key]}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className={`alm-phone-save ${saved ? "is-pressed" : ""}`.trim()}>
                  <span>Guardar en el dispositivo</span>
                  <ClipboardIcon className="h-[18px] w-[18px]" />
                </div>

                <div className="alm-queue">
                  <p className="alm-qcount">
                    {items.length > 0 ? <Slash /> : null}
                    {countText}
                  </p>
                  <ul className="alm-qlist">
                    {items.map((item, index) => (
                      <li
                        key={item.code}
                        className={item.done ? "is-done" : ""}
                        style={{ "--queue-i": index } as CSSProperties}
                      >
                        <span>
                          {item.code} <em>{item.detail}</em>
                        </span>
                        <span className="alm-qstate">
                          {item.done ? "Subido" : "Pendiente"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={`alm-toast ${toast ? "is-visible" : ""}`.trim()}>
                Todo sincronizado con la oficina.
              </div>
            </div>
          </div>

          <p className="sr-only">
            Demostración visual de la app móvil. Los datos son de ejemplo.
          </p>
          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>

          <button
            type="button"
            className="alm-replay"
            onClick={() => {
              if (reduced) {
                showFinal();
              } else {
                setRun((value) => value + 1);
              }
            }}
          >
            <ReplayIcon />
            {reduced ? "Ver el estado sincronizado" : "Repetir la secuencia"}
          </button>
        </Reveal>
      </div>
    </section>
  );
}
