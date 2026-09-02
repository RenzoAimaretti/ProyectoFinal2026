"use client";

import { createContext, useContext, useState } from "react";
import type { NavItem } from "./layout";

export type Rol = "admin" | "adm-operativo" | "cliente";

export const ROLES: { id: Rol; label: string; desc: string }[] = [
  { id: "admin", label: "Admin / Dueño", desc: "Acceso total a todas las firmas y módulos" },
  { id: "adm-operativo", label: "Operativo Admin", desc: "Facturas, remitos, cheques y validación de insumos" },
  { id: "cliente", label: "Cliente / Productor", desc: "Su campo, estado de lotes y trazabilidad de insumos" },
];

/** Filtra los módulos de la nav según el rol. El operario no va aquí (app móvil). */
export function modulosPorRol(items: NavItem[], rol: Rol): NavItem[] {
  switch (rol) {
    case "adm-operativo":
      return items.filter((i) => ["Finanzas", "Insumos"].includes(i.label));
    case "cliente":
      return items.filter((i) =>
        ["Mi Campo", "Producción", "Insumos"].includes(i.label),
      );
    default:
      return items;
  }
}

const RolContext = createContext<{ rol: Rol; setRol: (r: Rol) => void }>({
  rol: "admin",
  setRol: () => {},
});

export function RolProvider({ children }: { children: React.ReactNode }) {
  const [rol, setRol] = useState<Rol>("admin");

  return <RolContext.Provider value={{ rol, setRol }}>{children}</RolContext.Provider>;
}

export function useRol() {
  return useContext(RolContext);
}