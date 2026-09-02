import { DashboardLayout } from "@/components/ui/layout";
import { Card, Badge, Button, StatRow, HeroBand, type Tone } from "@/components/ui/primitives";
import { navItems } from "@/components/ui/nav";
import { AreaLine } from "@/components/ui/charts";

const facturas = [
  { num: "F 0042", cliente: "Agro-Sur", monto: "$ 1.420.000", estado: "cobrada" },
  { num: "F 0043", cliente: "Campo Verde", monto: "$ 2.100.000", estado: "emitida" },
  { num: "F 0044", cliente: "Estancia Los Pinos", monto: "$ 860.000", estado: "cheque" },
] as const;

const factMeta: Record<string, { label: string; tone: Tone }> = {
  emitida: { label: "Emitida", tone: "slate" },
  cobrada: { label: "Cobrada", tone: "green" },
  cheque: { label: "Cheque", tone: "earth" },
};

const cheques = [
  { num: "Ch 5520", emisor: "Agro-Sur", vence: "12/10", monto: "$ 620.000" },
  { num: "Ch 5521", emisor: "Campo Verde", vence: "28/10", monto: "$ 1.100.000" },
  { num: "Ch 5522", emisor: "Fertilar", vence: "05/11", monto: "$ 380.000" },
] as const;

export default function FinanzasPage() {
  return (
    <DashboardLayout
      title="Finanzas"
      sidebarItems={navItems}
      breadcrumb="Administración y facturación"
    >
      <HeroBand
        kicker="Administración y facturación"
        title="Finanzas"
        description="Libro contable de campaña, facturación a clientes y control de cheques con indexación."
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        }
        actions={
          <div className="flex flex-col items-start gap-1 text-white/90">
            <span className="text-xs uppercase tracking-wider text-white/70">Saldo de campaña</span>
            <span className="text-2xl font-bold text-white">$ 2.410.000</span>
          </div>
        }
      />

      {/* Tendencia de cotizaciones de granos */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
          <div>
            <h3 className="font-semibold text-ink">Cotización de granos</h3>
            <p className="text-sm text-ink-soft">Tendencia de mercado · Trigo (últimos 8 días)</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="green">▲ +2,4%</Badge>
            <span className="text-lg font-bold text-ink">$ 280/kg</span>
          </div>
        </div>
        <div className="p-5">
          <AreaLine
            data={[238, 245, 241, 256, 262, 259, 271, 280]}
            color="#3a7d44"
            height={150}
            className="h-40 w-full"
          />
          <div className="mt-3 flex justify-between text-[11px] font-medium text-ink-faint">
            <span>01/09</span>
            <span>03/09</span>
            <span>05/09</span>
            <span>07/09</span>
            <span>09/09</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Columna de saldo: libro contable */}
        <aside className="lg:col-span-1">
          <Card className="overflow-hidden">
            <div className="space-y-4 px-5 py-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Ingresos</p>
                <StatRow label="Facturados" value="$ 4,5 M" />
                <StatRow label="Informales" value="$ 1,1 M" className="mt-1.5" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Costos</p>
                <StatRow label="Operativos" value="$ 3,2 M" />
                <StatRow label="Combustible" value="$ 2,3 M" className="mt-1.5" />
              </div>
              <div className="rounded-lg bg-base-subtle p-3">
                <StatRow label="Margen bruto" value="$ 2,4 M" />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-ink-soft">Rentabilidad</span>
                  <Badge tone="green">+34 %</Badge>
                </div>
              </div>
            </div>
            <div className="border-t border-agro-border p-3">
              <Button className="w-full">Exportar a contable</Button>
            </div>
          </Card>
        </aside>

        {/* Facturacion */}
        <section className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-agro-border px-5 py-4">
              <div>
                <h3 className="font-semibold text-ink">Facturas por cliente</h3>
                <p className="text-sm text-ink-soft">Emisión e ingreso vinculado a tareas.</p>
              </div>
              <Badge tone="slate">3 · hoy</Badge>
            </div>

            <div className="grid grid-cols-12 gap-3 border-b border-agro-border px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <span className="col-span-3">Factura</span>
              <span className="col-span-4">Cliente</span>
              <span className="col-span-3 text-right">Monto</span>
              <span className="col-span-2 text-right">Estado</span>
            </div>

            <ul className="divide-y divide-agro-border">
              {facturas.map((f) => {
                const m = factMeta[f.estado];
                return (
                  <li key={f.num} className="stagger-item grid grid-cols-12 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-base-subtle">
                    <span className="col-span-3 text-sm font-semibold text-ink">{f.num}</span>
                    <span className="col-span-4 text-sm text-ink-soft">{f.cliente}</span>
                    <span className="col-span-3 text-right text-sm font-semibold text-ink">{f.monto}</span>
                    <span className="col-span-2 text-right"><Badge tone={m.tone}>{m.label}</Badge></span>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-agro-border p-3">
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-agro-border px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-agro-green hover:text-agro-green">
                + Nueva factura
              </button>
            </div>
          </Card>
        </section>

        {/* Cheques e indexacion */}
        <aside className="lg:col-span-1">
          <div className="space-y-5">
            <Card>
              <div className="border-b border-agro-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">Cheques en cartera</h3>
                  <Badge tone="earth">3</Badge>
                </div>
              </div>
              <ul className="divide-y divide-agro-border">
                {cheques.map((c) => (
                  <li key={c.num} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{c.num} · {c.emisor}</p>
                      <p className="text-xs text-ink-faint">Vence {c.vence} · {c.monto}</p>
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6" /></svg>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Indexación</p>
              <StatRow label="Dólar BNA" value="$ 1.420" />
              <StatRow label="Trigo (kilos)" value="$ 280/kg" className="mt-1.5" />
              <p className="mt-3 rounded-lg bg-base-subtle p-2.5 text-xs text-ink-soft">
                Tarifas pactadas se actualizan en <b className="text-ink">kilos de cereal</b> (R031).
              </p>
            </Card>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}