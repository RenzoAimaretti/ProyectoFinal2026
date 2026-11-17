import type { CSSProperties } from "react";
import { VALUE_PROPS } from "./content";
import { Reveal, SectionHead, Slash } from "./primitives";

export function Distinctives() {
  return (
    <section
      id="distingue"
      aria-labelledby="t-distingue"
      className="alm-wrap alm-sec"
    >
      <SectionHead
        id="t-distingue"
        title="Lo que distingue a la plataforma"
        lead="El dato se carga una vez en el campo y llega a la oficina y al cliente sin volver a tipearlo."
      />

      <Reveal as="ul" stagger className="alm-feat-grid">
        {VALUE_PROPS.map((value, index) => (
          <li
            key={value.title}
            className="alm-feat"
            style={{ "--i": index } as CSSProperties}
          >
            <h3>
              <Slash />
              {value.title}
            </h3>
            <p>{value.text}</p>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
