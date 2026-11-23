"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import { Card, EmptyState, TabButton } from "@/components/ui/primitives";
import { FinanceIcon } from "@/components/ui/icons";
import { navItems } from "@/components/ui/nav";
import { getStoredUser } from "@/api/client";
import { defaultFinanceTab, visibleFinanceTabs, type FinanceTabId } from "./access";
import { CalculadoraTab } from "./calculadora-tab";
import { CategoriasTab } from "./categorias-tab";
import { GastosTab } from "./gastos-tab";
import { SugerenciasTab } from "./sugerencias-tab";
import { TarifarioTab } from "./tarifario-tab";

const TAB_LABELS: Record<FinanceTabId, string> = {
  tarifario: "Tarifario",
  gastos: "Gastos",
  categorias: "Categorías",
  sugerencias: "Sugerencias",
  calculadora: "Calculadora",
};

export default function FinanzasPage() {
  // `undefined` until the stored session is read on the client (no SSR guess).
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [selected, setSelected] = useState<FinanceTabId | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setRole(getStoredUser()?.role ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const tabs = role === undefined ? [] : visibleFinanceTabs(role);
  const active = selected && tabs.includes(selected) ? selected : defaultFinanceTab(role);

  return (
    <DashboardLayout
      title="Finanzas"
      sidebarItems={navItems}
      breadcrumb="Administración y facturación"
    >
      <section className="op-plate mb-5 flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="op-label">Administración y facturación</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Finanzas</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Tarifario por tipo de labor, gastos manuales por lote, sugerencias y rentabilidad por lote, con importes en
            pesos, dólares o kilos de cereal.
          </p>
        </div>
      </section>

      {tabs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1" role="tablist" aria-label="Secciones de Finanzas">
          {tabs.map((tab) => (
            <TabButton key={tab} active={tab === active} onClick={() => setSelected(tab)}>
              {TAB_LABELS[tab]}
            </TabButton>
          ))}
        </div>
      )}

      {active === "tarifario" && <TarifarioTab />}
      {active === "gastos" && <GastosTab role={role} />}
      {active === "categorias" && <CategoriasTab />}
      {active === "sugerencias" && <SugerenciasTab role={role} />}
      {active === "calculadora" && <CalculadoraTab />}

      {role !== undefined && active === null && (
        <Card>
          <EmptyState
            icon={<FinanceIcon />}
            title="Todavía no hay secciones disponibles para tu rol"
            subtitle="El Tarifario es exclusivo del administrador. Los gastos, las categorías y las sugerencias están disponibles para administradores y supervisores."
          />
        </Card>
      )}
    </DashboardLayout>
  );
}
