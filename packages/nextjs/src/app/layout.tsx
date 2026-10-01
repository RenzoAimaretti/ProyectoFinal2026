import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider, Toaster } from "@/components/ui/feedback";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Agro Trazabilidad",
    template: "%s · Agro Trazabilidad",
  },
  description:
    "Plataforma SaaS de trazabilidad agropecuaria multi-tenant para gestión de campos, partes de trabajo e insumos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ToastProvider>
          {children}
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}