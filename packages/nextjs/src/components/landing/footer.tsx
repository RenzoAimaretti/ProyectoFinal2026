import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { WHATSAPP_URL } from "@/lib/contact";
import { FOOTER_GROUPS } from "./content";
import { ArrowUpIcon } from "./icons";

function FooterLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  if (href === "whatsapp") {
    return (
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }

  if (href.startsWith("#")) {
    return <a href={href}>{label}</a>;
  }

  return <Link href={href}>{label}</Link>;
}

export function Footer() {
  return (
    <footer className="alm-footer">
      <div className="alm-wrap">
        <div className="alm-footer-top">
          <div>
            <Link href="/" className="alm-brand" aria-label="Agro Trazabilidad, inicio">
              <LogoMark size={38} />
              <span className="alm-brand-text">
                <span className="alm-brand-name">Agro Trazabilidad</span>
                <span className="alm-brand-reg">Registro agropecuario</span>
              </span>
            </Link>
            <p className="alm-footer-desc">
              Captura offline-first en el lote y trazabilidad de punta a punta
              para gestionar campos, producción, partes de trabajo e insumos.
              Varias firmas operan con sus datos aislados sobre la misma
              plataforma.
            </p>
          </div>

          <a href="#campania" className="alm-footer-up">
            Volver arriba
            <ArrowUpIcon />
          </a>
        </div>

        <div className="alm-footer-cols">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="alm-k">{group.title}</p>
              <ul>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="alm-footer-bottom">
          <p>© 2026 Agro Trazabilidad. Todos los derechos reservados.</p>
          <p>Fotografías de archivo. Cifras y registros de ejemplo.</p>
        </div>
      </div>
    </footer>
  );
}
