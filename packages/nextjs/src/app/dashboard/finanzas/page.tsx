import { DashboardLayout } from "@/components/ui/layout";
import { Card, EmptyState } from "@/components/ui/primitives";
import { FinanceIcon } from "@/components/ui/icons";
import { navItems } from "@/components/ui/nav";

export default function FinanzasPage() {
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
            Libro contable de campaña, facturación a clientes y control de cheques.
          </p>
        </div>
      </section>

      <Card>
        <EmptyState
          icon={<FinanceIcon />}
          title="Proximamente"
          subtitle="La facturación, los cheques y la indexación por kilos de cereal todavía no tienen modelo en el backend. Cuando estén disponibles, este módulo va a mostrar el libro contable real de la campaña."
        />
      </Card>
    </DashboardLayout>
  );
}
