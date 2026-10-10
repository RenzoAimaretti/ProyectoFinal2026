import type { Metadata, Viewport } from "next";
import { Archivo, Fraunces, Inter, Public_Sans, Spectral } from "next/font/google";
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
    template: "%s · Agro Trazabilidad",
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
    { media: "(prefers-color-scheme: light)", color: "#f4f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${fraunces.variable} ${almanacSerif.variable} ${almanacSans.variable} ${operateSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ToastProvider>
          {children}
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
