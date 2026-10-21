import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: "El almanaque de la campaña",
  description:
    "Captura offline-first en el lote y trazabilidad de punta a punta: cada labor, insumo y parte del campo a la oficina y al cliente.",
};

export default function Home() {
  return <Landing />;
}
