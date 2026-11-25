"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Modal } from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/form";
import { notifyPrescriptionInboxChanged } from "@/components/ui/nav";
import {
  ApiError,
  assignTaskOperator,
  createTask,
  type LaborTypeDTO,
  type ReapplicationAlertDTO,
  type UserDTO,
} from "@/api/client";

function describeCreateTaskError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | string | null;
    const apiMessage =
      body && typeof body === "object" && typeof body.message === "string"
        ? body.message
        : null;
    if (err.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
    if (err.status === 403)
      return "Tu rol no tiene permiso para crear tareas.";
    if (err.status >= 500)
      return apiMessage ?? "El servidor no pudo responder. Intentá nuevamente.";
    return apiMessage ?? `No se pudo crear la tarea (código ${err.status}).`;
  }
  return "No se pudo crear la tarea. Revisá tu conexión e intentá nuevamente.";
}

function localTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function CreateTaskFromAlertForm({
  alert,
  laborTypes,
  users,
  onClose,
  onCreated,
}: {
  alert: ReapplicationAlertDTO;
  laborTypes: LaborTypeDTO[];
  users: UserDTO[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const todayKey = localTodayKey();
  const targetKey = alert.targetDate ? alert.targetDate.slice(0, 10) : todayKey;
  const defaultDate = alert.daysRemaining < 0 ? todayKey : targetKey;
  const defaultLabor =
    alert.laborTypeId ||
    laborTypes.find((l) => l.requiresPrescription)?.id ||
    laborTypes[0]?.id ||
    "";

  const [laborTypeId, setLaborTypeId] = useState(defaultLabor);
  const [operatorId, setOperatorId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("08:00");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const operatorOptions = useMemo(
    () => [
      { value: "", label: "Sin asignar" },
      ...users
        .filter((u) => u.role === "OPERARIO" && u.active !== false)
        .map((u) => ({ value: u.id, label: u.username ?? u.email })),
    ],
    [users],
  );

  const handleSubmit = useCallback(async () => {
    if (creating) return;
    if (!laborTypeId) {
      setError("Seleccioná un tipo de labor.");
      return;
    }
    if (!date) {
      setError("Indicá una fecha.");
      return;
    }
    const iso = new Date(`${date}T${time || "08:00"}:00`).toISOString();
    setCreating(true);
    setError(null);
    try {
      const created = await createTask({
        lotId: alert.lotId,
        laborTypeId,
        startedAt: iso,
      });

      let assignmentFailed = false;
      if (operatorId) {
        try {
          await assignTaskOperator(created.id, operatorId);
        } catch {
          assignmentFailed = true;
        }
      }

      if (assignmentFailed) {
        toast.info(
          "Tarea creada sin operario",
          "Se programó la tarea, pero no se pudo asignar el operario. Podés asignarlo en Producción.",
        );
      } else {
        toast.success(
          "Tarea creada desde la alerta",
          `Se programó la re-aplicación para ${alert.farmName} · ${alert.lotName}.`,
        );
      }
      notifyPrescriptionInboxChanged();
      onCreated();
      onClose();
    } catch (err) {
      const message = describeCreateTaskError(err);
      setError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }, [
    creating,
    laborTypeId,
    date,
    time,
    alert.lotId,
    alert.farmName,
    alert.lotName,
    operatorId,
    toast,
    onCreated,
    onClose,
  ]);

  return (
    <Modal
      open
      onClose={() => (creating ? undefined : onClose())}
      title="Crear tarea desde alerta de doble golpe"
      subtitle={`${alert.farmName} · ${alert.lotName} (${alert.clientName})`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={creating}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={creating || !laborTypeId}
          >
            {creating ? "Creando…" : "Crear tarea"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="rounded-lg border border-agro-border bg-base-subtle/40 p-3 text-xs text-ink-soft">
          <p className="font-semibold text-ink">
            Qué hay que hacer (receta original)
          </p>
          <p className="mt-1">
            {alert.crop ?? "Cultivo s/d"} · {alert.pest ?? "Control fitosanitario"}
            {alert.laborTypeName ? ` · Labor previa: ${alert.laborTypeName}` : ""}
          </p>
          {alert.observations && (
            <p className="mt-1 italic">“{alert.observations}”</p>
          )}
        </div>

        <SelectField
          label="Tipo de labor"
          value={laborTypeId}
          onChange={(e) => setLaborTypeId(e.target.value)}
          options={laborTypes.map((l) => ({ value: l.id, label: l.name }))}
          placeholder="Seleccioná un tipo de labor"
          disabled={creating || laborTypes.length === 0}
        />

        <SelectField
          label="Operario"
          value={operatorId}
          onChange={(e) => setOperatorId(e.target.value)}
          options={operatorOptions}
          disabled={creating}
          hint="Opcional. Podés asignarlo ahora o más tarde en Producción."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Fecha programada"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={creating}
          />
          <TextField
            label="Hora"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={creating}
          />
        </div>
      </div>
    </Modal>
  );
}

export function CreateTaskFromAlertModal({
  alert,
  laborTypes,
  users,
  onClose,
  onCreated,
}: {
  alert: ReapplicationAlertDTO | null;
  laborTypes: LaborTypeDTO[];
  users: UserDTO[];
  onClose: () => void;
  onCreated: () => void;
}) {
  if (!alert) return null;
  return (
    <CreateTaskFromAlertForm
      key={alert.recipeId}
      alert={alert}
      laborTypes={laborTypes}
      users={users}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}
