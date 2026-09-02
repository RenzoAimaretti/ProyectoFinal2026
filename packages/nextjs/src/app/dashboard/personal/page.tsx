"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import { Card, Badge, IconTile, Button, StatRow, TabButton, HeroBand, type Tone } from "@/components/ui/primitives";
import { navItems } from "@/components/ui/nav";

const plantel = [
  { nombre: "Juan Pérez", cargo: "Operario", esquema: "Destajo", valor: "$ 18/ha", cert: "ok" },
  { nombre: "María López", cargo: "Operaria", esquema: "Porcentaje", valor: "8 %", cert: "ok" },
  { nombre: "Carlos Ruiz", cargo: "Operario", esquema: "Jornal", valor: "$ 45.000/día", cert: "avisa" },
  { nombre: "Ana Torres", cargo: "Ing. Agrónoma", esquema: "Porcentaje", valor: "6 %", cert: "ok" },
  { nombre: "Luis Díaz", cargo: "Operario", esquema: "Destajo", valor: "$ 20/ha", cert: "avisa" },
] as const;

const esquemaTone: Record<string, Tone> = { Destajo: "earth", Porcentaje: "green", Jornal: "slate" };
const certTone: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Al día", tone: "green" },
  avisa: { label: "Certif. por vencer", tone: "wheat" },
};

export default function PersonalPage() {
  const [esquema, setEsquema] = useState<string>("Destajo");
  const visibles = plantel.filter((p) => p.esquema === esquema);

  return (
    <DashboardLayout
      title="Personal"
      sidebarItems={navItems}
      breadcrumb="Gestión de usuarios y liquidaciones"
    >
      <HeroBand
        kicker="Gestión de recursos humanos"
        title="Personal"
        description="Plantel activo, esquemas de pago, certificaciones y liquidaciones por destajo."
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">42 operarios</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">7 destajo</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">12 por %</span>
            <Button className="!bg-white/95 !text-agro-green-deep !hover:bg-white">+ Nuevo operario</Button>
          </div>
        }
      />

      {/* Esquemas de pago */}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Tabla del plantel */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-agro-border px-5 py-4">
            <div>
              <h3 className="font-semibold text-ink">Plantel y esquema de pago</h3>
              <p className="text-sm text-ink-soft">Destajo, porcentaje o jornal según liquidación.</p>
            </div>
            <div className="flex gap-1 rounded-lg bg-base-subtle p-1">
              {["Destajo", "Porcentaje", "Jornal"].map((t) => (
                <TabButton key={t} active={esquema === t} onClick={() => setEsquema(t)}>{t}</TabButton>
              ))}
            </div>
          </div>

          <div className="hidden grid-cols-12 gap-3 border-b border-agro-border px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint lg:grid">
            <span className="col-span-6">Operario</span>
            <span className="col-span-4">Esquema</span>
            <span className="col-span-2 text-right">Certificación</span>
          </div>

          <ul className="divide-y divide-agro-border">
            {visibles.map((p) => {
              const c = certTone[p.cert];
              const esq = esquemaTone[p.esquema];
              return (
                <li key={p.nombre} className="grid grid-cols-12 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-base-subtle">
                  <div className="col-span-12 flex items-center gap-3 lg:col-span-6">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-agro-green/15 text-xs font-semibold text-agro-green-deep">
                      {p.nombre.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{p.nombre}</p>
                      <p className="text-xs text-ink-faint">{p.cargo}</p>
                    </div>
                  </div>
                  <div className="col-span-6 lg:col-span-4">
                    <Badge tone={esq}>{p.esquema}</Badge>
                    <span className="ml-2 text-xs text-ink-soft">{p.valor}</span>
                  </div>
                  <div className="col-span-6 flex justify-end lg:col-span-2">
                    {p.cert === "avisa" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-agro-ochre/10 px-2.5 py-1 text-[11px] font-semibold text-agro-earth-dark ring-1 ring-inset ring-agro-ochre/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-agro-ochre" />
                        Certif. por vencer
                      </span>
                    ) : (
                      <Badge tone={c.tone}>{c.label}</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Certificaciones + haberes */}
        <div className="space-y-5">
          <Card>
            <div className="border-b border-agro-border px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink">Certificaciones</h3>
                <Badge tone="wheat">2 por vencer</Badge>
              </div>
            </div>
            <div className="space-y-3 px-5 py-4">
              {[
                { n: "Carlos Ruiz", materia: "Licencia fitosanitaria", vence: "12 días" },
                { n: "Luis Díaz", materia: "Apto físico", vence: "30 días" },
              ].map((c) => (
                <div key={c.n} className="flex items-start gap-3 rounded-lg bg-agro-wheat/10 p-3">
                  <IconTile tone="wheat" className="h-8 w-8">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M9 3.75h6a3 3 0 013 3v10.5a3 3 0 01-3 3H9a3 3 0 01-3-3V6.75a3 3 0 013-3z" /></svg>
                  </IconTile>
                  <div>
                    <p className="text-sm font-medium text-ink">{c.n}</p>
                    <p className="text-xs text-ink-soft">{c.materia}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-agro-earth-dark">Vence en {c.vence}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Liquidación por destajo</p>
            <StatRow label="Hectáreas reportadas" value="1.540 ha" />
            <StatRow label="Valor por hectárea" value="$ 18" className="mt-1.5" />
            <div className="mt-3 rounded-lg bg-agro-green/10 p-3">
              <StatRow label="Total a pagar" value="$ 27.720" />
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}