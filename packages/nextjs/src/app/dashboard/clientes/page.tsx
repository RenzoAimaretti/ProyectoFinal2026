"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
} from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { DataTable, type DataTableColumn } from "@/components/ui/table";
import { TextField } from "@/components/ui/form";
import { navItems, isAdminRole } from "@/components/ui/nav";
import { useAuth } from "@/components/ui/auth";
import {
  CheckIcon,
  PeopleIcon,
  PlusIcon,
  RefreshIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  ApiError,
  createClientWithAccess,
  listClients,
  type ClientDTO,
  type CreateClientResult,
} from "@/api/client";

type LotDraft = { key: string; name: string; area: string };

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: unknown } | null;
    const raw =
      body && typeof body === "object" && "message" in body
        ? (body as { message?: unknown }).message
        : null;
    const apiMessage =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw.filter((m): m is string => typeof m === "string").join(" ")
          : null;
    if (err.status === 409) return apiMessage ?? "Ya existe un usuario con ese email.";
    if (err.status === 400) return apiMessage ?? "Los datos enviados no son válidos.";
    if (err.status === 403) return "No tenés permisos para crear clientes.";
    if (err.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
    return `No se pudo completar la operación (código ${err.status}).`;
  }
  return "No pudimos conectar con el servidor. Revisá tu conexión.";
}

export default function ClientesPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    listClients()
      .then((data) => {
        if (alive) setClients(data);
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

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lots, setLots] = useState<LotDraft[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const lotKey = useRef(0);
  const nextKey = () => `l${lotKey.current++}`;

  // Result modal: shows the generated password once.
  const [created, setCreated] = useState<CreateClientResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setFarmName("");
    setPhone("");
    setAddress("");
    setLots([{ key: nextKey(), name: "", area: "" }]);
    setFormError(null);
    setCreateOpen(true);
  }, []);

  const addLot = () =>
    setLots((prev) => [...prev, { key: nextKey(), name: "", area: "" }]);

  const updateLot = (key: string, patch: Partial<LotDraft>) =>
    setLots((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const removeLot = (key: string) =>
    setLots((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));

  const validate = useCallback((): string | null => {
    if (!email.trim()) return "Ingresá el email del cliente.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Ingresá un email válido.";
    }
    if (!firstName.trim()) return "Ingresá el nombre.";
    if (!lastName.trim()) return "Ingresá el apellido.";
    if (!farmName.trim()) return "Ingresá el nombre del establecimiento.";
    if (lots.length === 0) return "Agregá al menos un lote.";
    for (const lot of lots) {
      if (!lot.name.trim()) return "Cada lote necesita un nombre.";
      const area = Number(lot.area);
      if (!Number.isFinite(area) || area <= 0) {
        return "El área de cada lote debe ser mayor a cero.";
      }
    }
    return null;
  }, [email, firstName, lastName, farmName, lots]);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    const invalid = validate();
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      const result = await createClientWithAccess({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        farmName: farmName.trim(),
        phone: phone.trim() ? phone.trim() : undefined,
        address: address.trim() ? address.trim() : undefined,
        lots: lots.map((l) => ({ name: l.name.trim(), area: Number(l.area) })),
      });
      setCreateOpen(false);
      setCreated(result);
      setCopied(false);
      setCopyError(null);
      toast.success("Cliente creado", "Compartí la contraseña temporal con el productor.");
      refresh();
    } catch (err) {
      const message = describeError(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }, [
    creating,
    email,
    firstName,
    lastName,
    farmName,
    phone,
    address,
    lots,
    validate,
    toast,
    refresh,
  ]);

  const copyPassword = useCallback(async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.password);
      setCopied(true);
      setCopyError(null);
    } catch {
      setCopyError(
        "No pudimos copiarla automáticamente. Seleccioná el texto y copialo manualmente.",
      );
    }
  }, [created]);

  const columns: DataTableColumn<ClientDTO>[] = [
    {
      key: "name",
      header: "Cliente",
      render: (row) => (
        <div>
          <p className="font-medium text-ink">{row.name}</p>
          {(row.firstName || row.lastName) && (
            <p className="text-xs text-ink-faint">
              {[row.firstName, row.lastName].filter(Boolean).join(" ")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "cuit",
      header: "CUIT",
      render: (row) => <span className="text-ink-soft">{row.cuit ?? "—"}</span>,
    },
    {
      key: "active",
      header: "Estado",
      align: "right",
      render: (row) => (
        <Badge tone={row.active ? "green" : "slate"}>
          {row.active ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Clientes"
      sidebarItems={navItems}
      breadcrumb="Cartera de productores y accesos"
    >
      <section className="op-plate mb-5 flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="op-label">Gestión de clientes</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Clientes</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Cartera de productores del tenant. Creá un cliente con su campo, lotes y acceso propio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right">
            {loading ? (
              <div className="skeleton ml-auto h-8 w-14" aria-hidden="true" />
            ) : (
              <p className="op-num text-3xl font-bold leading-none text-ink">{clients.length}</p>
            )}
            <p className="op-label mt-1">Clientes</p>
            <p className="op-caption mt-0.5">En la cartera</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="op-btn"
              aria-busy={loading}
            >
              <RefreshIcon className="h-4 w-4" />
              {loading ? "Actualizando…" : "Actualizar"}
            </button>
            {isAdmin && (
              <button type="button" onClick={openCreate} className="op-btn op-btn--primary">
                <PlusIcon className="h-4 w-4" />
                Nuevo cliente
              </button>
            )}
          </div>
        </div>
      </section>

      {loadError && (
        <Alert tone="error" title="No se pudieron cargar los clientes" className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button variant="secondary" onClick={refresh}>
              Reintentar
            </Button>
          </div>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          data={clients}
          rowKey={(row) => row.id}
          loading={loading}
          skeletonRows={5}
          emptyState={
            <EmptyState
              icon={<PeopleIcon />}
              title="Sin clientes"
              subtitle="Todavía no hay productores en la cartera. Creá el primero con Nuevo cliente."
            />
          }
        />
      </Card>

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="Nuevo cliente"
        subtitle="Se crea el cliente, su usuario PRODUCTOR y el acceso con contraseña temporal."
        widthClass="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating}>
              {creating ? "Creando…" : "Crear cliente"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="productor@agro.com"
              disabled={creating}
            />
            <TextField
              label="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Opcional"
              disabled={creating}
            />
            <TextField
              label="Nombre"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={creating}
            />
            <TextField
              label="Apellido"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={creating}
            />
            <TextField
              label="Establecimiento"
              required
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="Nombre del campo"
              disabled={creating}
            />
            <TextField
              label="Dirección"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Opcional"
              disabled={creating}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-ink">Lotes</h4>
              <Button variant="secondary" onClick={addLot} disabled={creating}>
                <PlusIcon className="h-4 w-4" />
                Agregar lote
              </Button>
            </div>
            <ul className="space-y-2">
              {lots.map((lot) => (
                <li key={lot.key} className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextField
                      label="Nombre del lote"
                      value={lot.name}
                      onChange={(e) => updateLot(lot.key, { name: e.target.value })}
                      disabled={creating}
                    />
                  </div>
                  <div className="w-32">
                    <TextField
                      label="Área (ha)"
                      type="number"
                      min="0"
                      step="any"
                      value={lot.area}
                      onChange={(e) => updateLot(lot.key, { area: e.target.value })}
                      disabled={creating}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLot(lot.key)}
                    disabled={creating || lots.length <= 1}
                    title={
                      lots.length <= 1
                        ? "Debe quedar al menos un lote."
                        : "Quitar lote"
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

      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title="Cliente creado"
        subtitle="Compartí estas credenciales con el productor. Deberá cambiar la contraseña en su primer ingreso."
        widthClass="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreated(null)}>
              Cerrar
            </Button>
            <Button onClick={() => void copyPassword()}>
              <CheckIcon className="h-4 w-4" />
              {copied ? "Copiado" : "Copiar contraseña"}
            </Button>
          </div>
        }
      >
        {created && (
          <div className="space-y-4">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-ink-faint">
                Usuario
              </span>
              <p className="rounded-lg border border-agro-border bg-base-subtle/40 px-3 py-2.5 text-sm text-ink">
                {created.email}
              </p>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-ink-faint">
                Contraseña temporal
              </span>
              <p className="select-all rounded-lg border border-agro-border bg-base-subtle/40 px-3 py-2.5 font-mono text-sm font-semibold text-ink">
                {created.password}
              </p>
            </div>
            {copyError && <Alert tone="warning">{copyError}</Alert>}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
