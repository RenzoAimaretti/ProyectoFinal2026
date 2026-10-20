import type { CSSProperties } from "react";
import { ROLES } from "./content";
import { Reveal, SectionHead } from "./primitives";

export function Roles() {
  return (
    <section
      id="roles"
      aria-labelledby="t-roles"
      className="alm-wrap alm-sec"
    >
      <SectionHead
        id="t-roles"
        title="Un rol para cada persona de la cadena"
        lead="Desde el dueño que mira el negocio completo hasta el operario que carga el parte a pie de lote. Cada uno entra a lo que necesita."
      />

      <Reveal stagger className="alm-roles">
        {ROLES.map((role, index) => (
          <article
            key={role.title}
            className="alm-role"
            style={{ "--i": index } as CSSProperties}
          >
            <span className="alm-k">{role.access}</span>
            <div>
              <h3>{role.title}</h3>
              <p>{role.text}</p>
            </div>
          </article>
        ))}
      </Reveal>
    </section>
  );
}
