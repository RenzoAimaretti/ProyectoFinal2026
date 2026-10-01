"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  HeroBand,
  Modal,
  StatusBadge,
  type StatusMap,
} from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/table";
import { SelectField, TextField, TextareaField } from "@/components/ui/form";
import { isAdminRole, navItems } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import {
  CheckIcon,
  InboxIcon,
  InputsIcon,
  PlusIcon,
  RefreshIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  ApiError,
  createReception,
  listClients,
  listInputs,
  listReceptions,
  listStock,
  rejectReception,
  validateReception,
  RECEPTION_STATUS_LABELS,
  type ClientDTO,
  type InputDTO,
  type ReceptionDTO,
  type ReceptionItemDTO,
  type ReceptionStatus,
  type StockDTO,
} from "@/api/client";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const numberFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

function fmtDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : dateFmt.format(d);
}

const RECEPTION_BADGE: StatusMap<ReceptionStatus> = {
  PENDIENTE_VALIDACION: { label: RECEPTION_STATUS_LABELS.PENDIENTE_VALIDACION, tone: "wheat" },
  VALIDADA: { label: RECEPTION_STATUS_LABELS.VALIDADA, tone: "green" },
  RECHAZADA: { label: RECEPTION_STATUS_LABELS.RECHAZADA, tone: "earth" },
};

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | string | null;
    const apiMessage =
      body && typeof body === "object" && typeof body.message === "string"
        ? body.message
        : null;
    if (err.status === 400) {
      return apiMessage ?? "Los datos enviados no son válidos.";
    }
    if (err.status === 404) {
      return "La recepción ya no existe o fue eliminada.";
    }
    if (err.status === 409) {
      return "La recepción ya fue resuelta por otra persona.";
    }
    if (err.status === 401) {
      return "Tu sesión expiró. Volvé a iniciar sesión.";
    }
    return `No se pudo completar la acción (código ${err.status}).`;
  }
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

type DraftItem = { key: string; inputId: string; quantity: string };

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function InsumosPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [inputs, setInputs] = useState<InputDTO[]>([]);
  const [receptions, setReceptions] = useState<ReceptionDTO[]>([]);
  const [stock, setStock] = useState<StockDTO[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setStockLoading(true);
    setStockError(null);
    setVersion((v) => v + 1);
  }, []);

  // Detail / validation drawer
  const [selectedReception, setSelectedReception] = useState<ReceptionDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [validatedById, setValidatedById] = useState<Record<string, string>>({});
  const [validateError, setValidateError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Create (registrar ingreso) modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createClientId, setCreateClientId] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const draftKey = useRef(0);
  const nextKey = () => `d${draftKey.current++}`;

  /* ----- Catalogues + receptions ----- */
  useEffect(() => {
    let alive = true;
    Promise.all([listClients(), listInputs(), listReceptions()])
      .then(([clientList, inputList, receptionList]) => {
        if (!alive) return;
        setClients(clientList);
        setInputs(inputList);
        setReceptions(receptionList);
        setSelectedClientId((prev) => prev || clientList[0]?.id || "");
      })
      .catch((err) => {
        if (alive) setLoadError(describeError(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [version]);

  /* ----- Stock for the selected client ----- */
  useEffect(() => {
    let alive = true;
    if (!selectedClientId) return;
    listStock(selectedClientId)
      .then((data) => {
        if (alive) setStock(data);
      })
      .catch((err) => {
        if (alive) setStockError(describeError(err));
      })
      .finally(() => {
        if (alive) setStockLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedClientId, version]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const visibleReceptions = useMemo(
    () =>
      isAdmin
        ? receptions
        : receptions.filter((r) => r.clientId === selectedClientId),
    [isAdmin, receptions, selectedClientId],
  );

  const pendingReceptions = useMemo(
    () => visibleReceptions.filter((r) => r.status === "PENDIENTE_VALIDACION"),
    [visibleReceptions],
  );

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));
  const inputOptions = inputs.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }));

  /* ----- Detail drawer ----- */
  const openDetail = useCallback((reception: ReceptionDTO) => {
    setSelectedReception(reception);
    setDetailOpen(true);
    setValidateError(null);
    setRejectReason("");
    setRejectError(null);
    const initial: Record<string, string> = {};
    reception.items.forEach((item) => {
      initial[item.inputId] = String(item.quantity);
    });
    setValidatedById(initial);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedReception(null);
    setValidateError(null);
    setRejectError(null);
    setValidating(false);
    setRejecting(false);
  }, []);

  const handleValidate = useCallback(async () => {
    if (!selectedReception || validating) return;
    const parsed = selectedReception.items.map((item) => ({
      inputId: item.inputId,
      quantity: Number(validatedById[item.inputId] ?? ""),
    }));
    const invalid = parsed.some((p) => !Number.isFinite(p.quantity) || p.quantity <= 0);
    if (invalid) {
      setValidateError("Cada cantidad validada debe ser mayor a cero.");
      return;
    }
    setValidating(true);
    setValidateError(null);
    try {
      await validateReception(
        selectedReception.id,
        parsed.map((p) => ({ inputId: p.inputId, validatedQuantity: p.quantity })),
      );
      toast.success("Recepción validada", "El stock del cliente se actualizó.");
      closeDetail();
      refresh();
    } catch (err) {
      const message = describeError(err);
      setValidateError(message);
      toast.error(message);
    } finally {
      setValidating(false);
    }
  }, [selectedReception, validating, validatedById, toast, closeDetail, refresh]);

  const requestReject = useCallback(() => {
    if (!rejectReason.trim()) {
      setRejectError("Ingresá un motivo para rechazar la recepción.");
      return;
    }
    setRejectError(null);
    setRejectConfirmOpen(true);
  }, [rejectReason]);

  const confirmReject = useCallback(async () => {
    if (!selectedReception || rejecting) return;
    setRejectConfirmOpen(false);
    setRejecting(true);
    setRejectError(null);
    try {
      await rejectReception(selectedReception.id, rejectReason.trim());
      toast.success("Recepción rechazada", "Se registró el motivo del rechazo.");
      closeDetail();
      refresh();
    } catch (err) {
      const message = describeError(err);
      setRejectError(message);
      toast.error(message);
    } finally {
      setRejecting(false);
    }
  }, [selectedReception, rejecting, rejectReason, toast, closeDetail, refresh]);

  /* ----- Create modal ----- */
  const openCreate = useCallback(() => {
    setCreateClientId(selectedClientId || clients[0]?.id || "");
    setCreateDate(new Date().toISOString().slice(0, 10));
    setDraftItems([
      { key: nextKey(), inputId: inputs[0]?.id ?? "", quantity: "" },
    ]);
    setCreateError(null);
    setCreateOpen(true);
  }, [selectedClientId, clients, inputs]);

  const updateDraftItem = (key: string, patch: Partial<DraftItem>) => {
    setDraftItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const addDraftItem = () => {
    const used = new Set(draftItems.map((d) => d.inputId));
    const next = inputs.find((i) => !used.has(i.id));
    setDraftItems((prev) => [
      ...prev,
      { key: nextKey(), inputId: next?.id ?? "", quantity: "" },
    ]);
  };

  const removeDraftItem = (key: string) => {
    setDraftItems((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.key !== key)));
  };

  const inputOptionsFor = (currentKey: string) => {
    const usedElsewhere = new Set(
      draftItems.filter((d) => d.key !== currentKey).map((d) => d.inputId),
    );
    return inputOptions.map((opt) => ({ ...opt, disabled: usedElsewhere.has(opt.value) }));
  };

  const handleCreate = useCallback(async () => {
    if (creating) return;
    if (!createClientId) {
      setCreateError("Seleccioná un cliente.");
      return;
    }
    if (!createDate) {
      setCreateError("Indicá una fecha.");
      return;
    }
    const complete = draftItems.filter(
      (d) => d.inputId && Number(d.quantity) > 0 && Number.isFinite(Number(d.quantity)),
    );
    if (draftItems.length === 0 || complete.length !== draftItems.length) {
      setCreateError("Completá insumo y cantidad mayor a cero en cada fila.");
      return;
    }
    if (new Set(complete.map((d) => d.inputId)).size !== complete.length) {
      setCreateError("No repitas el mismo insumo en una recepción.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createReception({
        clientId: createClientId,
        date: createDate,
        items: complete.map((d) => ({ inputId: d.inputId, quantity: Number(d.quantity) })),
      });
      toast.success(
        "Ingreso registrado",
        "Queda pendiente de validación por el administrador.",
      );
      setCreateOpen(false);
      setDraftItems([]);
      refresh();
    } catch (err) {
      const message = describeError(err);
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }, [creating, createClientId, createDate, draftItems, toast, refresh]);

  /* ----- Tables ----- */
  const stockColumns: DataTableColumn<StockDTO>[] = [
    {
      key: "input",
      header: "Insumo",
      render: (row) => <span className="font-medium text-ink">{row.inputName}</span>,
    },
    {
      key: "quantity",
      header: "Disponible",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-ink">
          {numberFmt.format(row.quantity)}
          <span className="ml-1 text-xs font-medium text-ink-faint">{row.unit}</span>
        </span>
      ),
    },
  ];

  const receptionColumns: DataTableColumn<ReceptionDTO>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (row) => <span className="text-ink">{fmtDate(row.date)}</span>,
    },
    {
      key: "client",
      header: "Cliente",
      render: (row) => <span className="text-ink-soft">{row.clientName}</span>,
    },
    {
      key: "items",
      header: "Insumos",
      align: "center",
      render: (row) => <Badge tone="slate">{row.items.length}</Badge>,
    },
    {
      key: "status",
      header: "Estado",
      align: "right",
      render: (row) => <StatusBadge status={row.status} map={RECEPTION_BADGE} />,
    },
  ];

  const hasItems = selectedReception ? selectedReception.items.length > 0 : false;
  const isPending = selectedReception?.status === "PENDIENTE_VALIDACION";
  const canResolve = isAdmin && isPending;

  return (
    <DashboardLayout
      title="Insumos"
      sidebarItems={navItems}
      breadcrumb="Recepción de stock y control de partes"
    >
      <HeroBand
        kicker={isAdmin ? "Recepción y control de stock" : "Trazabilidad de tus insumos"}
        title="Insumos"
        description={
          isAdmin
            ? "Stock por cliente, bandeja de ingresos por validar y carga de recepciones."
            : "Registrá los insumos que dejás en el campo y seguí su estado de validación y stock."
        }
        icon={<InputsIcon className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">
              {pendingReceptions.length} por validar
            </span>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshIcon className="h-4 w-4" />
              Actualizar
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={clients.length === 0 || inputs.length === 0}
              title={
                clients.length === 0 || inputs.length === 0
                  ? "Necesitás clientes e insumos cargados para registrar una recepción."
                  : undefined
              }
              className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2.5 text-sm font-semibold text-agro-green-deep transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusIcon className="h-4 w-4" />
              Registrar ingreso
            </button>
          </div>
        }
      />

      {loadError && (
        <Alert tone="error" title="No se pudieron cargar los datos" className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button variant="secondary" onClick={refresh}>
              Reintentar
            </Button>
          </div>
        </Alert>
      )}

      {!isAdmin && clients.length > 1 && (
        <Alert tone="info" title="Seleccioná un cliente" className="mb-5">
          Tu sesión no está asociada a un único cliente, así que elegí el cliente cuyo
          stock y recepciones querés ver.
        </Alert>
      )}

      {/* Stock */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-agro-border px-5 py-4">
          <div>
            <h3 className="font-semibold text-ink">Stock por cliente</h3>
            <p className="text-sm text-ink-soft">
              Disponible según recepciones validadas.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <SelectField
              label="Cliente"
              value={selectedClientId}
              onChange={(e) => {
                setStockLoading(true);
                setStockError(null);
                setSelectedClientId(e.target.value);
              }}
              options={clientOptions}
              placeholder="Seleccioná un cliente"
              disabled={clients.length === 0}
            />
          </div>
        </div>

        {stockError ? (
          <Alert tone="error" title="No se pudo cargar el stock" className="m-5">
            {stockError}
          </Alert>
        ) : (
          <DataTable
            columns={stockColumns}
            data={stock}
            rowKey={(row) => row.id}
            loading={stockLoading}
            skeletonRows={4}
            emptyState={
              <EmptyState
                icon={<InputsIcon />}
                title="Sin stock para este cliente"
                subtitle={
                  selectedClient
                    ? `No hay insumos disponibles para ${selectedClient.name}.`
                    : "Seleccioná un cliente para ver su stock."
                }
              />
            }
          />
        )}
      </Card>

      {/* Reception inbox */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
          <div>
            <h3 className="font-semibold text-ink">
              {isAdmin ? "Recepciones" : "Mis recepciones"}
            </h3>
            <p className="text-sm text-ink-soft">
              {isAdmin
                ? "Ingresos declarados por los clientes; validá o rechazá los pendientes."
                : "Estado de cada ingreso que registraste."}
            </p>
          </div>
          <Badge tone={pendingReceptions.length > 0 ? "wheat" : "green"}>
            {pendingReceptions.length} pendientes
          </Badge>
        </div>

        <DataTable
          columns={receptionColumns}
          data={visibleReceptions}
          rowKey={(row) => row.id}
          onRowClick={openDetail}
          loading={loading}
          skeletonRows={5}
          emptyState={
            <EmptyState
              icon={<InboxIcon />}
              title="Sin recepciones"
              subtitle="Las recepciones registradas aparecerán acá."
            />
          }
        />
      </Card>

      {/* Detail / resolution drawer */}
      <Drawer
        open={detailOpen}
        onClose={closeDetail}
        title={selectedReception ? `Recepción · ${selectedReception.clientName}` : "Recepción"}
        subtitle={selectedReception ? fmtDate(selectedReception.date) : undefined}
        widthClass="max-w-2xl"
        footer={
          canResolve ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={closeDetail} disabled={validating || rejecting}>
                Cerrar
              </Button>
              <Button variant="danger" onClick={requestReject} disabled={validating || rejecting}>
                <XIcon className="h-4 w-4" />
                Rechazar
              </Button>
              <Button onClick={() => void handleValidate()} disabled={validating || rejecting}>
                <CheckIcon className="h-4 w-4" />
                {validating ? "Validando…" : "Validar"}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={closeDetail}>
                Cerrar
              </Button>
            </div>
          )
        }
      >
        {selectedReception && (
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge status={selectedReception.status} map={RECEPTION_BADGE} />
              <span className="text-sm text-ink-soft">
                {selectedReception.clientName} · {fmtDate(selectedReception.date)}
              </span>
            </div>

            {selectedReception.status === "RECHAZADA" && selectedReception.rejectionReason && (
              <Alert tone="error" title="Motivo de rechazo">
                {selectedReception.rejectionReason}
              </Alert>
            )}

            {validateError && <Alert tone="error">{validateError}</Alert>}

            <div>
              <h4 className="mb-2 text-sm font-semibold text-ink">Insumos declarados</h4>
              {!hasItems ? (
                <p className="rounded-lg border border-dashed border-agro-border px-3 py-4 text-center text-sm text-ink-soft">
                  Esta recepción no tiene insumos.
                </p>
              ) : (
                <ul className="divide-y divide-agro-border rounded-lg border border-agro-border">
                  {selectedReception.items.map((item: ReceptionItemDTO) => {
                    const raw = validatedById[item.inputId] ?? "";
                    const parsed = Number(raw);
                    const hasValue = raw !== "" && Number.isFinite(parsed);
                    const variance = hasValue ? parsed - item.quantity : null;
                    return (
                      <li key={item.inputId} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">
                              {item.inputName}
                            </p>
                            <p className="text-xs text-ink-faint">
                              Declarado: {numberFmt.format(item.quantity)} {item.unit}
                            </p>
                          </div>

                          {canResolve ? (
                            <div className="flex items-end gap-3">
                              <div className="w-36">
                                <TextField
                                  label="Validado"
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={raw}
                                  onChange={(e) =>
                                    setValidatedById((prev) => ({
                                      ...prev,
                                      [item.inputId]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <span
                                className={`pb-2.5 text-xs font-semibold ${
                                  variance === null
                                    ? "text-ink-faint"
                                    : variance < 0
                                      ? "text-agro-earth-dark"
                                      : variance > 0
                                        ? "text-agro-green-dark"
                                        : "text-ink-soft"
                                }`}
                              >
                                {variance === null
                                  ? "—"
                                  : `${variance > 0 ? "+" : ""}${numberFmt.format(variance)} ${item.unit}`}
                              </span>
                            </div>
                          ) : (
                            <div className="text-right">
                              <p className="text-sm font-semibold text-ink">
                                {item.validatedQuantity === null
                                  ? "Sin validar"
                                  : `${numberFmt.format(item.validatedQuantity)} ${item.unit}`}
                              </p>
                              {item.variance !== null && (
                                <p
                                  className={`text-xs font-medium ${
                                    item.variance < 0
                                      ? "text-agro-earth-dark"
                                      : item.variance > 0
                                        ? "text-agro-green-dark"
                                        : "text-ink-soft"
                                  }`}
                                >
                                  Diferencia: {item.variance > 0 ? "+" : ""}
                                  {numberFmt.format(item.variance)} {item.unit}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {canResolve && (
              <div className="rounded-lg border border-agro-border bg-base-subtle/40 p-4">
                <h4 className="text-sm font-semibold text-ink">Rechazar recepción</h4>
                <p className="mt-0.5 text-xs text-ink-soft">
                  El rechazo no modifica el stock y queda registrado con su motivo.
                </p>
                {rejectError && (
                  <Alert tone="error" className="mt-3">
                    {rejectError}
                  </Alert>
                )}
                <div className="mt-3">
                  <TextareaField
                    label="Motivo"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ej: la cantidad declarada no coincide con el remito"
                    disabled={validating || rejecting}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Registrar ingreso */}
      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="Registrar ingreso de insumos"
        subtitle="Queda pendiente de validación por el administrador."
        widthClass="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <span
              className="inline-flex"
              title={
                inputs.length === 0 || clients.length === 0
                  ? "Necesitás clientes e insumos cargados."
                  : undefined
              }
            >
              <Button
                onClick={() => void handleCreate()}
                disabled={creating || inputs.length === 0 || clients.length === 0}
              >
                {creating ? "Registrando…" : "Registrar ingreso"}
              </Button>
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          {createError && <Alert tone="error">{createError}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Cliente"
              value={createClientId}
              onChange={(e) => setCreateClientId(e.target.value)}
              options={clientOptions}
              placeholder="Seleccioná un cliente"
              disabled={creating || clients.length === 0}
            />
            <TextField
              label="Fecha"
              type="date"
              value={createDate}
              onChange={(e) => setCreateDate(e.target.value)}
              disabled={creating}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-ink">Insumos</h4>
              <span
                className="inline-flex"
                title={
                  draftItems.length >= inputs.length
                    ? "Ya agregaste todos los insumos disponibles."
                    : undefined
                }
              >
                <Button
                  variant="secondary"
                  onClick={addDraftItem}
                  disabled={creating || inputs.length === 0 || draftItems.length >= inputs.length}
                >
                  <PlusIcon className="h-4 w-4" />
                  Agregar
                </Button>
              </span>
            </div>

            <ul className="space-y-2">
              {draftItems.map((draft) => (
                <li key={draft.key} className="flex items-end gap-2">
                  <div className="flex-1">
                    <SelectField
                      label="Insumo"
                      value={draft.inputId}
                      onChange={(e) => updateDraftItem(draft.key, { inputId: e.target.value })}
                      options={inputOptionsFor(draft.key)}
                      placeholder="Seleccioná un insumo"
                      disabled={creating}
                    />
                  </div>
                  <div className="w-32">
                    <TextField
                      label="Cantidad"
                      type="number"
                      min="0"
                      step="any"
                      value={draft.quantity}
                      onChange={(e) => updateDraftItem(draft.key, { quantity: e.target.value })}
                      disabled={creating}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDraftItem(draft.key)}
                    disabled={creating || draftItems.length <= 1}
                    title={
                      draftItems.length <= 1
                        ? "Debe quedar al menos un insumo."
                        : "Quitar insumo"
                    }
                    className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-agro-border text-ink-soft transition-colors hover:bg-base-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={rejectConfirmOpen}
        onClose={() => setRejectConfirmOpen(false)}
        onConfirm={() => void confirmReject()}
        title="Rechazar recepción"
        message={
          <>
            ¿Confirmás el rechazo de la recepción de{" "}
            <strong>{selectedReception?.clientName}</strong> del{" "}
            {selectedReception ? fmtDate(selectedReception.date) : ""}? El motivo
            quedará registrado.
          </>
        }
        confirmLabel="Rechazar"
        loading={rejecting}
        tone="danger"
      />
    </DashboardLayout>
  );
}
