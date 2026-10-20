import type { Metadata, Viewport } from "next";
import {
  Archivo,
  Fraunces,
  Inter,
  Public_Sans,
  Spectral,
} from "next/font/google";
import { ToastProvider, Toaster } from "@/components/ui/feedback";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Display face for headings and protagonist numerals (dashboard + incumbent).
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

// "El Almanaque de la Campaña" world fonts — applied ONLY inside
// `.almanac-world`. Kept separate from Inter/Fraunces so the authenticated
// dashboard system is untouched.
// - Spectral: editorial workhorse serif for the ledger and headings.
// - Archivo: plain neutral sans for UI labels.
const almanacSerif = Spectral({
  variable: "--font-almanac-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const almanacSans = Archivo({
  variable: "--font-almanac-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// "La Carta de Suelos" world font — applied ONLY inside `.operate-world`
// (the authenticated dashboard shell). A workmanlike grotesk with tabular
// figures; kept separate from Inter/Fraunces so the incumbent + almanac
// worlds are untouched.
const operateSans = Public_Sans({
  variable: "--font-operate-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Agro Trazabilidad",
  title: {
    default: "Agro Trazabilidad",
    template: "%s — Agro Trazabilidad",
  },
  description:
    "Plataforma de trazabilidad agropecuaria con captura offline-first en el lote, para la gestión de campos, partes de trabajo e insumos.",
  keywords: [
    "trazabilidad agropecuaria",
    "gestión de campos",
    "partes de trabajo",
    "insumos",
    "agronegocios",
    "software agrícola",
  ],
  authors: [{ name: "Agro Trazabilidad" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Agro Trazabilidad",
    title: "Agro Trazabilidad",
    description:
      "Trazabilidad integral de campos, partes de trabajo e insumos en una sola plataforma.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f3f0" },
    { media: "(prefers-color-scheme: dark)", color: "#121915" },
  ],
  colorScheme: "light dark",
};

/**
 * Runs before the landing content is parsed:
 * - restores the manual theme without a flash;
 * - marks the document as motion-capable for the CSS reveal system;
 * - installs a short fail-safe. If React has not hydrated within 2.5s, the
 *   class is removed so every block is visible even while JS is still loading.
 */
const motionBoot = `
(function () {
  try {
    var saved = window.localStorage.getItem("agro-theme");
    if (saved === "dark" || saved === "light") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  } catch (error) {}

  if (window.location.pathname !== "/" && window.location.pathname !== "") {
    return;
  }

  document.body.classList.add("alm-js");
  window.__almMotionTimer = window.setTimeout(function () {
    if (!document.body.classList.contains("alm-ready")) {
      document.body.classList.remove("alm-js");
      document.body.setAttribute("data-alm-fallback", "1");
    }
  }, 2500);
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${fraunces.variable} ${almanacSerif.variable} ${almanacSans.variable} ${operateSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: motionBoot }} />
        <ToastProvider>
          {children}
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
