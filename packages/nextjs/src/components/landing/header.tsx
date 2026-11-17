"use client";

import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { NAV } from "./content";
import { useScrolled } from "./hooks";
import { MoonIcon, SunIcon } from "./icons";

function toggleTheme() {
  const root = document.documentElement;
  const current =
    root.getAttribute("data-theme") ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  const next = current === "dark" ? "light" : "dark";

  root.setAttribute("data-theme", next);
  try {
    window.localStorage.setItem("agro-theme", next);
  } catch {
    // Storage can be unavailable in private contexts; the theme still applies.
  }
}

export function Header() {
  const scrolled = useScrolled(8);

  return (
    <header className={`alm-header ${scrolled ? "is-scrolled" : ""}`.trim()}>
      <div className="alm-wrap alm-header-bar">
        <Link
          href="/"
          className="alm-brand"
          aria-label="Agro Trazabilidad, inicio"
        >
          <LogoMark size={36} />
          <span className="alm-brand-text">
            <span className="alm-brand-name">Agro Trazabilidad</span>
            <span className="alm-brand-reg">Registro agropecuario</span>
          </span>
        </Link>

        <nav className="alm-nav" aria-label="Principal">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="alm-nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="alm-bar-actions">
          <button
            type="button"
            onClick={toggleTheme}
            className="alm-iconbtn"
            aria-label="Cambiar entre tema claro y oscuro"
            title="Tema"
          >
            <SunIcon className="alm-theme-icon alm-theme-icon--sun" />
            <MoonIcon className="alm-theme-icon alm-theme-icon--moon" />
          </button>
          <Link href="/login" className="alm-login">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}
