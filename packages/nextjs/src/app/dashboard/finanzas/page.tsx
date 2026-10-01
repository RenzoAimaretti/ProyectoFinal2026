import { DashboardLayout } from "@/components/ui/layout";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { FinanceIcon } from "@/components/ui/icons";
import { navItems } from "@/components/ui/nav";

export default function FinanzasPage() {
  return (
    <DashboardLayout
      title="Finanzas"
      sidebarItems={navItems}
      breadcrumb="Administración y facturación"
    >
      <PageHeader
        title="Finanzas"
        subtitle="Libro contable de campaña, facturación a clientes y control de cheques."
      />

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
