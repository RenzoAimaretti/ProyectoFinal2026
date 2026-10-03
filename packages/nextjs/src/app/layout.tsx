import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ToastProvider, Toaster } from "@/components/ui/feedback";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Display face for headings and protagonist numerals.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Agro Trazabilidad",
  title: {
    default: "Agro Trazabilidad",
    template: "%s · Agro Trazabilidad",
  },
  description:
    "Plataforma SaaS de trazabilidad agropecuaria multi-tenant para gestión de campos, partes de trabajo e insumos.",
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
    <html lang="es" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ToastProvider>
          {children}
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
