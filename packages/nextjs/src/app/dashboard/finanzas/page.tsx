"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, API_BASE, ApiError, getToken, handleUnauthorized, listClients, type ClientDTO } from "@/api/client";
import { CreateChequeForm, CreateInvoiceForm, CreatePaymentForm } from "@/components/finanzas/create-forms";
import { useAuth } from "@/components/ui/auth";
import { Alert } from "@/components/ui/feedback";
import { FinanceIcon } from "@/components/ui/icons";
import { DashboardLayout } from "@/components/ui/layout";
import { isApproverRole, navItems } from "@/components/ui/nav";
import { Button, Card, CardHeader, EmptyState, PageHeader, StatusBadge, type StatusMap } from "@/components/ui/primitives";
import { DataTable, type DataTableColumn } from "@/components/ui/table";

type InvoiceStatus = "EMITIDA" | "COBRADA" | "ANULADA";
type ChequeStatus = "EN_CARTERA" | "DEPOSITADO" | "COBRADO" | "RECHAZADO" | "ENDOSADO";
type EcheqStatus = "PENDIENTE" | "ACREDITADO" | "DEBITADO" | "RECHAZADO";
type Invoice = { id: string; number: string; clientId: string; issueDate: string; totalAmount: number; status: InvoiceStatus };
type Cheque = { id: string; number: string; issuer: string; dueDate: string; amount: number; status: ChequeStatus };
type PendingEcheq = { id: string; code: string; issuer: string; direction: "EMITIDO" | "RECIBIDO"; dueDate: string; amount: number; status: EcheqStatus; overdue: boolean };
type PaymentKind = "FACTURADO" | "INFORMAL";
type Payment = { id: string; clientId: string; kind: PaymentKind; method: "EFECTIVO" | "TRANSFERENCIA" | "CHEQUE" | "ECHEQ"; amount: number; date: string; usdRate: number | null };
type InvoiceData = { invoices: Invoice[]; clients: ClientDTO[] };
type PaymentData = { payments: Payment[]; clients: ClientDTO[] };
type LoadState<T> = { data: T | null; loading: boolean; error: string | null };

const invoiceStatuses: StatusMap<InvoiceStatus> = {
  EMITIDA: { label: "Emitida", tone: "wheat" },
  COBRADA: { label: "Cobrada", tone: "green" },
  ANULADA: { label: "Anulada", tone: "earth" },
};
const paymentKinds: StatusMap<PaymentKind> = {
  FACTURADO: { label: "Facturado", tone: "green" },
  INFORMAL: { label: "Informal", tone: "wheat" },
};
const paymentMethods: Record<Payment["method"], string> = {
  EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", CHEQUE: "Cheque", ECHEQ: "eCheq",
};
const chequeStatuses: StatusMap<ChequeStatus> = {
  EN_CARTERA: { label: "En cartera", tone: "wheat" },
  DEPOSITADO: { label: "Depositado", tone: "slate" },
  COBRADO: { label: "Cobrado", tone: "green" },
  RECHAZADO: { label: "Rechazado", tone: "earth" },
  ENDOSADO: { label: "Endosado", tone: "slate" },
};
const echeqStatuses: StatusMap<EcheqStatus> = {
  PENDIENTE: { label: "Pendiente", tone: "wheat" },
  ACREDITADO: { label: "Acreditado", tone: "green" },
  DEBITADO: { label: "Debitado", tone: "green" },
  RECHAZADO: { label: "Rechazado", tone: "earth" },
};
const chequeActions: Record<ChequeStatus, { status: ChequeStatus; label: string }[]> = {
  EN_CARTERA: [
    { status: "DEPOSITADO", label: "Depositar" },
    { status: "ENDOSADO", label: "Endosar" },
    { status: "RECHAZADO", label: "Rechazar" },
  ],
  DEPOSITADO: [
    { status: "COBRADO", label: "Marcar cobrado" },
    { status: "RECHAZADO", label: "Rechazar" },
  ],
  COBRADO: [], RECHAZADO: [], ENDOSADO: [],
};
const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const amountFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}
function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === "string") return message;
      if (Array.isArray(message)) return message.filter((part): part is string => typeof part === "string").join(" ");
    }
    if (error.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
    if (error.status === 403) return "No tenés permisos para consultar las finanzas.";
    return `No se pudo completar la operación (código ${error.status}).`;
  }
  return "No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.";
}

// The shared API client has GET/POST/PUT/DELETE but no PATCH helper.
async function patchFinance<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (response.status === 401) handleUnauthorized();
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, `PATCH ${path} -> ${response.status}`, payload);
  }
  return response.json() as Promise<T>;
}

function SectionContent<T>({ state, onRetry, columns, rows, emptyTitle, emptySubtitle }: {
  state: LoadState<unknown>; onRetry: () => void; columns: DataTableColumn<T>[]; rows: T[];
  emptyTitle: string; emptySubtitle: string;
}) {
  if (state.error) return <div className="p-5"><Alert tone="error" title="No se pudieron cargar los datos">{state.error}</Alert><Button variant="secondary" className="mt-3" onClick={onRetry}>Reintentar</Button></div>;
  return <DataTable columns={columns} data={rows} rowKey={(row) => (row as { id: string }).id} loading={state.loading} emptyState={<EmptyState icon={<FinanceIcon />} title={emptyTitle} subtitle={emptySubtitle} />} className="m-5" />;
}

export default function FinanzasPage() {
  const { user, ready } = useAuth();
  const allowed = ready && isApproverRole(user?.role);
  const [invoiceState, setInvoiceState] = useState<LoadState<InvoiceData>>({ data: null, loading: true, error: null });
  const [paymentState, setPaymentState] = useState<LoadState<PaymentData>>({ data: null, loading: true, error: null });
  const [paymentKind, setPaymentKind] = useState<PaymentKind | "">("");
  const [chequeState, setChequeState] = useState<LoadState<Cheque[]>>({ data: null, loading: true, error: null });
  const [echeqState, setEcheqState] = useState<LoadState<PendingEcheq[]>>({ data: null, loading: true, error: null });
  const [invoiceVersion, setInvoiceVersion] = useState(0);
  const [paymentVersion, setPaymentVersion] = useState(0);
  const [chequeVersion, setChequeVersion] = useState(0);
  const [echeqVersion, setEcheqVersion] = useState(0);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [chequeFormOpen, setChequeFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [chequeActionError, setChequeActionError] = useState<string | null>(null);
  const [echeqActionError, setEcheqActionError] = useState<string | null>(null);

  const refreshInvoices = useCallback(() => { setInvoiceState({ data: null, loading: true, error: null }); setInvoiceVersion((v) => v + 1); }, []);
  const refreshPayments = useCallback(() => { setPaymentState({ data: null, loading: true, error: null }); setPaymentVersion((v) => v + 1); }, []);
  const refreshCheques = useCallback(() => { setChequeState({ data: null, loading: true, error: null }); setChequeVersion((v) => v + 1); }, []);
  const refreshEcheqs = useCallback(() => { setEcheqState({ data: null, loading: true, error: null }); setEcheqVersion((v) => v + 1); }, []);

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    Promise.all([apiGet<Invoice[]>("/invoices"), listClients()])
      .then(([invoices, clients]) => { if (alive) setInvoiceState({ data: { invoices, clients }, loading: false, error: null }); })
      .catch((error: unknown) => { if (alive) setInvoiceState({ data: null, loading: false, error: describeError(error) }); });
    return () => { alive = false; };
  }, [allowed, invoiceVersion]);
  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    const path = paymentKind ? `/payments?kind=${paymentKind}` : "/payments";
    Promise.all([apiGet<Payment[]>(path), listClients()])
      .then(([payments, clients]) => { if (alive) setPaymentState({ data: { payments, clients }, loading: false, error: null }); })
      .catch((error: unknown) => { if (alive) setPaymentState({ data: null, loading: false, error: describeError(error) }); });
    return () => { alive = false; };
  }, [allowed, paymentKind, paymentVersion]);
  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    apiGet<Cheque[]>("/cheques")
      .then((data) => { if (alive) setChequeState({ data, loading: false, error: null }); })
      .catch((error: unknown) => { if (alive) setChequeState({ data: null, loading: false, error: describeError(error) }); });
    return () => { alive = false; };
  }, [allowed, chequeVersion]);
  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    apiGet<PendingEcheq[]>("/echeqs/pending")
      .then((data) => { if (alive) setEcheqState({ data, loading: false, error: null }); })
      .catch((error: unknown) => { if (alive) setEcheqState({ data: null, loading: false, error: describeError(error) }); });
    return () => { alive = false; };
  }, [allowed, echeqVersion]);

  const changeCheque = async (cheque: Cheque, status: ChequeStatus) => {
    if (acting) return;
    setActing(cheque.id);
    setChequeActionError(null);
    try {
      await patchFinance<Cheque>(`/cheques/${encodeURIComponent(cheque.id)}/status`, { status });
      refreshCheques();
    } catch (error) { setChequeActionError(describeError(error)); }
    finally { setActing(null); }
  };
  const resolveEcheq = async (echeq: PendingEcheq, reject: boolean) => {
    if (acting) return;
    setActing(echeq.id);
    setEcheqActionError(null);
    try {
      const path = `/echeqs/${encodeURIComponent(echeq.id)}/${reject ? "reject" : "conciliate"}`;
      const body = reject ? {} : {
        status: echeq.direction === "RECIBIDO" ? "ACREDITADO" : "DEBITADO",
        settlementDate: new Date().toISOString(),
      };
      await patchFinance<PendingEcheq>(path, body);
      refreshEcheqs();
    } catch (error) { setEcheqActionError(describeError(error)); }
    finally { setActing(null); }
  };

  const clientNames = new Map(invoiceState.data?.clients.map((client) => [client.id, client.name]) ?? []);
  const invoiceColumns: DataTableColumn<Invoice>[] = [
    { key: "number", header: "Número", render: (row) => row.number },
    { key: "client", header: "Cliente", render: (row) => clientNames.get(row.clientId) ?? row.clientId },
    { key: "issueDate", header: "Emisión", render: (row) => formatDate(row.issueDate) },
    { key: "total", header: "Total", align: "right", render: (row) => amountFormatter.format(row.totalAmount) },
    { key: "status", header: "Estado", render: (row) => <StatusBadge status={row.status} map={invoiceStatuses} /> },
  ];
  const paymentClientNames = new Map(paymentState.data?.clients.map((client) => [client.id, client.name]) ?? []);
  const paymentColumns: DataTableColumn<Payment>[] = [
    { key: "client", header: "Cliente", render: (row) => paymentClientNames.get(row.clientId) ?? row.clientId },
    { key: "kind", header: "Tipo", render: (row) => <StatusBadge status={row.kind} map={paymentKinds} /> },
    { key: "method", header: "Medio", render: (row) => paymentMethods[row.method] },
    { key: "amount", header: "Importe", align: "right", render: (row) => amountFormatter.format(row.amount) },
    { key: "date", header: "Fecha", render: (row) => formatDate(row.date) },
    { key: "usdRate", header: "Cotización USD", render: (row) => row.usdRate === null ? "sin cotización" : amountFormatter.format(row.usdRate) },
  ];
  const chequeColumns: DataTableColumn<Cheque>[] = [
    { key: "number", header: "Número", render: (row) => row.number },
    { key: "issuer", header: "Emisor", render: (row) => row.issuer },
    { key: "dueDate", header: "Vencimiento", render: (row) => formatDate(row.dueDate) },
    { key: "amount", header: "Importe", align: "right", render: (row) => amountFormatter.format(row.amount) },
    { key: "status", header: "Estado", render: (row) => <StatusBadge status={row.status} map={chequeStatuses} /> },
    { key: "actions", header: "Acciones", render: (row) => <div className="flex flex-wrap gap-2">{chequeActions[row.status].map((action) => <Button key={action.status} variant={action.status === "RECHAZADO" ? "danger" : "secondary"} disabled={acting !== null} onClick={() => void changeCheque(row, action.status)}>{action.label}</Button>)}</div> },
  ];
  const echeqColumns: DataTableColumn<PendingEcheq>[] = [
    { key: "code", header: "Código", render: (row) => row.code },
    { key: "issuer", header: "Emisor", render: (row) => row.issuer },
    { key: "direction", header: "Tipo", render: (row) => row.direction === "RECIBIDO" ? "Recibido" : "Emitido" },
    { key: "dueDate", header: "Vencimiento", render: (row) => <span>{formatDate(row.dueDate)} {row.overdue && <span className="font-semibold text-danger">· Vencido</span>}</span> },
    { key: "amount", header: "Importe", align: "right", render: (row) => amountFormatter.format(row.amount) },
    { key: "status", header: "Estado", render: (row) => <StatusBadge status={row.status} map={echeqStatuses} /> },
    { key: "actions", header: "Acciones", render: (row) => <div className="flex flex-wrap gap-2"><Button disabled={acting !== null} onClick={() => void resolveEcheq(row, false)}>{row.direction === "RECIBIDO" ? "Acreditar" : "Debitar"}</Button><Button variant="danger" disabled={acting !== null} onClick={() => void resolveEcheq(row, true)}>Rechazar</Button></div> },
  ];
  return (
    <DashboardLayout title="Finanzas" sidebarItems={navItems} breadcrumb="Administración y facturación">
      <PageHeader title="Finanzas" subtitle="Facturación, cobros y control de cheques de tu firma." />
      {!ready ? <p className="text-sm text-ink-soft">Cargando sesión…</p> : !allowed ? <Alert tone="error">No tenés permisos para consultar las finanzas.</Alert> : (
        <div className="space-y-5">
          <section aria-label="Facturas"><Card><CardHeader title="Facturas" subtitle="Facturas emitidas por esta firma" action={<div className="flex flex-wrap gap-2"><Button onClick={() => setInvoiceFormOpen(true)} disabled={!invoiceState.data?.clients.length}>Nueva factura</Button><Button variant="secondary" onClick={refreshInvoices}>Actualizar</Button></div>} /><SectionContent state={invoiceState} onRetry={refreshInvoices} columns={invoiceColumns} rows={invoiceState.data?.invoices ?? []} emptyTitle="Sin facturas" emptySubtitle="Todavía no hay facturas registradas para esta firma." /></Card></section>
          <section aria-label="Cobros"><Card><CardHeader title="Cobros" subtitle="Ingresos facturados e informales de esta firma" action={<div className="flex flex-wrap gap-2"><Button onClick={() => setPaymentFormOpen(true)} disabled={!paymentState.data?.clients.length}>Nuevo cobro</Button><Button variant="secondary" onClick={refreshPayments}>Actualizar</Button></div>} /><div className="px-5 pt-4"><label htmlFor="payment-kind-filter" className="mr-2 text-sm text-ink-soft">Tipo de cobro</label><select id="payment-kind-filter" value={paymentKind} onChange={(event) => { setPaymentState({ data: null, loading: true, error: null }); setPaymentKind(event.target.value as PaymentKind | ""); }} className="rounded-lg border border-agro-border bg-card px-3 py-2 text-sm text-ink"><option value="">Todos</option><option value="FACTURADO">Facturados</option><option value="INFORMAL">Informales</option></select></div><SectionContent state={paymentState} onRetry={refreshPayments} columns={paymentColumns} rows={paymentState.data?.payments ?? []} emptyTitle="Sin cobros" emptySubtitle="No hay cobros registrados para esta firma y tipo." /></Card></section>
          <section aria-label="Cheques"><Card><CardHeader title="Cheques" subtitle="Seguimiento de cheques físicos" action={<div className="flex flex-wrap gap-2"><Button onClick={() => setChequeFormOpen(true)}>Nuevo cheque</Button><Button variant="secondary" onClick={refreshCheques}>Actualizar</Button></div>} />{chequeActionError && <div className="px-5 pt-4"><Alert tone="error" onDismiss={() => setChequeActionError(null)}>{chequeActionError}</Alert></div>}<SectionContent state={chequeState} onRetry={refreshCheques} columns={chequeColumns} rows={chequeState.data ?? []} emptyTitle="Sin cheques" emptySubtitle="No hay cheques físicos registrados para esta firma." /></Card></section>
          <section aria-label="eCheqs"><Card><CardHeader title="eCheqs pendientes" subtitle="Ordenados por vencimiento para su conciliación" action={<Button variant="secondary" onClick={refreshEcheqs}>Actualizar</Button>} />{echeqActionError && <div className="px-5 pt-4"><Alert tone="error" onDismiss={() => setEcheqActionError(null)}>{echeqActionError}</Alert></div>}<SectionContent state={echeqState} onRetry={refreshEcheqs} columns={echeqColumns} rows={[...(echeqState.data ?? [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))} emptyTitle="Sin eCheqs pendientes" emptySubtitle="No hay eCheqs pendientes de conciliación." /></Card></section>
          {invoiceFormOpen && <CreateInvoiceForm clients={invoiceState.data?.clients ?? []} describeError={describeError} onClose={() => setInvoiceFormOpen(false)} onCreated={() => { setInvoiceFormOpen(false); refreshInvoices(); }} />}
          {chequeFormOpen && <CreateChequeForm describeError={describeError} onClose={() => setChequeFormOpen(false)} onCreated={() => { setChequeFormOpen(false); refreshCheques(); }} />}
          {paymentFormOpen && <CreatePaymentForm clients={paymentState.data?.clients ?? []} invoices={invoiceState.data?.invoices ?? []} describeError={describeError} onClose={() => setPaymentFormOpen(false)} onCreated={() => { setPaymentFormOpen(false); refreshPayments(); refreshInvoices(); }} />}
        </div>
      )}
    </DashboardLayout>
  );
}
