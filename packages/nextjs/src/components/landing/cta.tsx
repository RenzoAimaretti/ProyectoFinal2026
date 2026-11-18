import Link from "next/link";
import { WHATSAPP_URL } from "@/lib/contact";
import { PLATES } from "./content";
import { WhatsAppIcon } from "./icons";
import { Placa } from "./placa";
import { DemoLink, Stamp } from "./primitives";

export function Cta() {
  return (
    <section
      id="cierre"
      aria-labelledby="t-cierre"
      className="alm-wrap alm-close"
    >
      <div className="alm-close-grid">
        <div className="alm-close-copy">
          <Stamp motion="view" rotate={-2}>
            Campaña 2025/26
          </Stamp>
          <h2 id="t-cierre">Cerrá la campaña con el dato ya cargado</h2>
          <p className="alm-lead">
            Recorré el demo con datos de ejemplo, sin crear cuenta, o hablá con
            nosotros para coordinar una demostración.
          </p>

          <DemoLink className="alm-close-demo" />

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
        </div>

        <div className="alm-close-plate">
          <Placa {...PLATES.close} />
        </div>
      </div>
    </section>
  );
}
