import Link from "next/link";
import { WHATSAPP_URL } from "@/lib/contact";
import { FAQ_ITEMS } from "./content";
import { WhatsAppIcon } from "./icons";
import { Reveal, SectionHead, Stamp } from "./primitives";

export function Faq() {
  return (
    <section
      id="consultas"
      aria-labelledby="t-consultas"
      className="alm-wrap alm-sec alm-faq-section"
    >
      <SectionHead
        id="t-consultas"
        title="Lo que conviene saber antes de empezar"
        lead="Si tu duda no está acá, escribinos y la vemos con el equipo."
      />

      <Reveal className="alm-faq-grid">
        <div className="alm-faq">
          {FAQ_ITEMS.map((item, index) => (
            <details
              key={item.q}
              name="faq"
              open={index === 0}
              className="alm-query"
            >
              <summary>{item.q}</summary>
              <p className="alm-faq-answer">{item.a}</p>
            </details>
          ))}
        </div>

        <aside className="alm-faq-aside">
          <Stamp motion="view" rotate={-2}>
            Sin cuenta
          </Stamp>
          <p className="alm-k">Seguir la conversación</p>
          <h3>¿Otra consulta?</h3>
          <p>
            Escribinos y coordinamos una demostración con los datos de tu
            campaña.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="alm-linkline alm-faq-link"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Hablar por WhatsApp
          </a>
          <Link href="/demo" className="alm-linkline alm-faq-link">
            Ver el demo con datos de ejemplo
          </Link>
        </aside>
      </Reveal>
    </section>
  );
}
