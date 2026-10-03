"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  HeroBand,
  Modal,
  StatRow,
  TabButton,
  type Tone,
} from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/table";
import { PeopleIcon, PlusIcon } from "@/components/ui/icons";
import { navItems } from "@/components/ui/nav";
import {
  ApiError,
  createUser,
  getStoredUser,
  listUsers,
  type UserDTO,
  type UserRole,
} from "@/api/client";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  OPERARIO: "Operario",
  SUPERVISOR: "Supervisor",
  PRODUCTOR: "Productor",
  CONTRATISTA: "Contratista",
  VETERINARIO: "Veterinario",
};

const ROLE_TONES: Record<UserRole, Tone> = {
  ADMIN: "green",
  OPERARIO: "slate",
  SUPERVISOR: "wheat",
  PRODUCTOR: "earth",
  CONTRATISTA: "slate",
  VETERINARIO: "green",
};

const ALL_ROLES = Object.keys(ROLE_LABELS) as UserRole[];

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
    if (err.status === 409) return "Ya existe un usuario con ese email o nombre de usuario.";
    if (err.status === 400) return "Revisá los datos ingresados.";
    return `No se pudo completar la operación (código ${err.status}).`;
  }
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

export default function PersonalPage() {
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | "TODOS">("TODOS");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    role: "OPERARIO" as UserRole,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setUsers(await listUsers());
    } catch (err) {
      setLoadError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const roleTabs = useMemo(() => {
    const present = Array.from(new Set(users.map((u) => u.role)));
    return ["TODOS", ...present] as (UserRole | "TODOS")[];
  }, [users]);

  const visible = useMemo(
    () => (roleFilter === "TODOS" ? users : users.filter((u) => u.role === roleFilter)),
    [users, roleFilter],
  );

  const openModal = useCallback(() => {
    setForm({ email: "", username: "", password: "", role: "OPERARIO" });
    setFormError(null);
    setModalOpen(true);
  }, []);

  const submitUser = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (submitting) return;

      const companyId = getStoredUser()?.firmaId;
      if (!companyId) {
        setFormError("Tu sesión no tiene una firma asociada. Volvé a iniciar sesión.");
        return;
      }
      if (!form.email.trim()) {
        setFormError("Ingresá el email del operario.");
        return;
      }
      if (form.password.length < 6) {
        setFormError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }

      setSubmitting(true);
      setFormError(null);
      try {
        await createUser({
          email: form.email.trim(),
          username: form.username.trim() || undefined,
          password: form.password,
          role: form.role,
          companyId,
          active: true,
        });
        success("Operario creado.", "Personal");
        setModalOpen(false);
        await load();
      } catch (err) {
        const message = describeError(err);
        setFormError(message);
        toastError(message, "No se pudo crear");
      } finally {
        setSubmitting(false);
      }
    },
    [form, load, submitting, success, toastError],
  );

  const columns: DataTableColumn<UserDTO>[] = [
    {
      key: "user",
      header: "Operario",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-agro-green/15 text-xs font-semibold text-agro-green-deep">
            {(u.username ?? u.email).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{u.username ?? "Sin usuario"}</p>
            <p className="truncate text-xs text-ink-faint">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      render: (u) => <span className="text-sm text-ink-soft">{u.email}</span>,
    },
    {
      key: "role",
      header: "Rol",
      render: (u) => <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>,
    },
    {
      key: "active",
      header: "Estado",
      align: "right",
      render: (u) => (
        <Badge tone={u.active ? "green" : "slate"}>{u.active ? "Activo" : "Inactivo"}</Badge>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Personal"
      sidebarItems={navItems}
      breadcrumb="Gestión de usuarios"
    >
      <HeroBand
        kicker="Gestión de recursos humanos"
        title="Personal"
        description="Usuarios de la firma con su rol y estado. Las liquidaciones y certificaciones llegan en una próxima etapa."
        icon={<PeopleIcon className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">
              {users.length} usuarios
            </span>
            <Button
              className="!bg-white/95 !text-agro-green-deep !hover:bg-white"
              onClick={openModal}
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo operario
            </Button>
          </div>
        }
      />

      {loadError && (
        <Alert tone="error" title="No se pudo cargar el personal" className="mb-5">
          {loadError}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Tabla del plantel */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
            <div>
              <h3 className="font-semibold text-ink">Usuarios de la firma</h3>
              <p className="text-sm text-ink-soft">Rol y estado reales del backend.</p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-base-subtle p-1">
              {roleTabs.map((role) => (
                <TabButton
                  key={role}
                  active={roleFilter === role}
                  onClick={() => setRoleFilter(role)}
                >
                  {role === "TODOS" ? "Todos" : ROLE_LABELS[role]}
                </TabButton>
              ))}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={visible}
            rowKey={(u) => u.id}
            loading={loading}
            emptyState={
              <EmptyState
                icon={<PeopleIcon />}
                title={users.length === 0 ? "Todavía no hay usuarios" : "Sin usuarios en este rol"}
                subtitle={
                  users.length === 0
                    ? "Creá el primer operario para empezar a gestionar el plantel."
                    : "Probá con otro rol o mirá todos los usuarios."
                }
              />
            }
          />
        </Card>

        {/* Proximamente: liquidaciones y certificaciones */}
        <div className="space-y-5">
          <Card>
            <div className="border-b border-agro-border px-5 py-4">
              <h3 className="font-semibold text-ink">Liquidaciones</h3>
            </div>
            <EmptyState
              icon={<PeopleIcon />}
              title="Proximamente"
              subtitle="El modelo de esquemas de pago, destajo y jornal todavía no existe en el backend."
            />
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold text-ink">Certificaciones</p>
            <p className="mt-1 text-sm text-ink-soft">
              Proximamente. No hay modelo de certificaciones ni vencimientos para mostrar.
            </p>
            <div className="mt-3">
              <StatRow label="Total usuarios" value={String(users.length)} />
              <StatRow
                label="Activos"
                value={String(users.filter((u) => u.active).length)}
                className="mt-1.5"
              />
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => (submitting ? undefined : setModalOpen(false))}
        title="Nuevo operario"
        subtitle="El usuario queda en la firma de tu sesión."
      >
        <form className="space-y-4" onSubmit={submitUser}>
          <TextField
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="operario@agro.com"
            disabled={submitting}
          />
          <TextField
            label="Usuario"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="Opcional"
            disabled={submitting}
          />
          <TextField
            label="Contraseña"
            type="password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Mínimo 6 caracteres"
            disabled={submitting}
          />
          <SelectField
            label="Rol"
            required
            options={ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            disabled={submitting}
          />

          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creando…" : "Crear operario"}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
