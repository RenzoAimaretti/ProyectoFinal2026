"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  HeroBand,
  IconTile,
  Modal,
  StatRow,
  type Tone,
} from "@/components/ui/primitives";
import { Alert, useToast } from "@/components/ui/feedback";
import { SelectField, TextareaField, TextField } from "@/components/ui/form";
import { ListSkeleton } from "@/components/ui/skeleton";
import { LivestockIcon, PlusIcon, ScaleIcon, SearchIcon } from "@/components/ui/icons";
import { navItems } from "@/components/ui/nav";
import {
  ApiError,
  apiGet,
  createLivestockEvent,
  getStoredUser,
  type LivestockDTO,
  type LivestockEventDTO,
  type LivestockEventType,
  type WeightRecordDTO,
} from "@/api/client";

const EVENT_TYPE_LABELS: Record<LivestockEventType, string> = {
  VACUNACION: "Vacunación",
  TRATAMIENTO: "Sanitario",
  CASTRACION: "Castración",
  INSEMINACION: "Inseminación",
  PARTO: "Parto",
  ENFERMEDAD: "Enfermedad",
};

const EVENT_TYPE_TONES: Record<LivestockEventType, Tone> = {
  VACUNACION: "green",
  TRATAMIENTO: "earth",
  CASTRACION: "slate",
  INSEMINACION: "wheat",
  PARTO: "slate",
  ENFERMEDAD: "earth",
};

const EVENT_TYPE_OPTIONS = (Object.keys(EVENT_TYPE_LABELS) as LivestockEventType[]).map(
  (value) => ({ value, label: EVENT_TYPE_LABELS[value] }),
);

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : dateFmt.format(d);
}

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) {
    return `Hoy · ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  }
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
    return `No se pudo completar la operación (código ${err.status}).`;
  }
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

type EventFormState = {
  livestockId: string;
  eventType: LivestockEventType | "";
  eventDate: string;
  obs: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GanaderoPage() {
  const { success, error: toastError } = useToast();

  const [livestocks, setLivestocks] = useState<LivestockDTO[]>([]);
  const [events, setEvents] = useState<LivestockEventDTO[]>([]);
  const [weights, setWeights] = useState<WeightRecordDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<EventFormState>({
    livestockId: "",
    eventType: "",
    eventDate: today(),
    obs: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [livestockData, eventData, weightData] = await Promise.all([
        apiGet<LivestockDTO[]>("/livestocks"),
        apiGet<LivestockEventDTO[]>("/livestock-events"),
        apiGet<WeightRecordDTO[]>("/weight-records"),
      ]);
      setLivestocks(livestockData);
      setEvents(eventData);
      setWeights(weightData);
    } catch (err) {
      setLoadError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return livestocks;
    return livestocks.filter((l) =>
      [l.tagNumber, l.species, l.breed ?? "", l.sex].join(" ").toLowerCase().includes(q),
    );
  }, [livestocks, query]);

  const selected = useMemo(
    () => visible.find((l) => l.id === selectedId) ?? visible[0] ?? null,
    [visible, selectedId],
  );

  const eventosActivo = useMemo(() => {
    if (!selected) return [];
    return events
      .filter((e) => e.livestockId === selected.id)
      .sort((a, b) => +new Date(b.eventDate) - +new Date(a.eventDate));
  }, [events, selected]);

  const pesos = useMemo(() => {
    if (!selected) return [];
    return weights
      .filter((w) => w.livestockId === selected.id)
      .sort((a, b) => +new Date(a.measuredAt) - +new Date(b.measuredAt));
  }, [weights, selected]);

  const pesoInicial = pesos[0]?.weight ?? null;
  const pesoActual = pesos.length > 0 ? pesos[pesos.length - 1].weight : null;
  const variacion = pesos.length >= 2 ? pesoActual! - pesoInicial! : null;
  const dias =
    pesos.length >= 2
      ? (new Date(pesos[pesos.length - 1].measuredAt).getTime() -
          new Date(pesos[0].measuredAt).getTime()) /
        86400000
      : 0;
  const gananciaMedia = variacion !== null && dias > 0 ? variacion / dias : null;

  const openModal = useCallback(() => {
    setForm({
      livestockId: selected?.id ?? livestocks[0]?.id ?? "",
      eventType: "",
      eventDate: today(),
      obs: "",
    });
    setFormError(null);
    setModalOpen(true);
  }, [livestocks, selected]);

  const submitEvent = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (submitting) return;

      const operatorId = getStoredUser()?.id;
      if (!operatorId) {
        setFormError("Tu sesión no tiene un operador asociado. Volvé a iniciar sesión.");
        return;
      }
      if (!form.livestockId) {
        setFormError("Seleccioná un animal.");
        return;
      }
      if (!form.eventType) {
        setFormError("Seleccioná el tipo de evento sanitario.");
        return;
      }
      if (!form.eventDate) {
        setFormError("Indicá la fecha del evento.");
        return;
      }

      setSubmitting(true);
      setFormError(null);
      try {
        await createLivestockEvent({
          livestockId: form.livestockId,
          eventType: form.eventType,
          eventDate: form.eventDate,
          operatorId,
          obs: form.obs.trim() || undefined,
        });
        success("Evento sanitario registrado.", "Ganadería");
        setModalOpen(false);
        await load();
      } catch (err) {
        const message = describeError(err);
        setFormError(message);
        toastError(message, "No se pudo registrar");
      } finally {
        setSubmitting(false);
      }
    },
    [form, load, submitting, success, toastError],
  );

  return (
    <DashboardLayout
      title="Ganadería"
      sidebarItems={navItems}
      breadcrumb="Ganadería de precisión · RFID"
    >
      <HeroBand
        kicker="Ganadería de precisión · RFID"
        title="Ganadería"
        description="Ficha clínica y productiva de cada animal por caravana: biometría, peso y trazabilidad sanitaria."
        icon={<LivestockIcon className="h-6 w-6" />}
        actions={
          <Button
            className="!bg-white/95 !text-agro-green-deep !hover:bg-white"
            onClick={openModal}
            disabled={livestocks.length === 0}
          >
            <PlusIcon className="h-4 w-4" />
            Evento sanitario
          </Button>
        }
      />

      {loadError && (
        <Alert tone="error" title="No se pudo cargar la ganadería" className="mb-5">
          {loadError}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Buscador de caravana / lista */}
        <aside className="lg:col-span-1">
          <Card className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 rounded-lg bg-base-subtle px-3 py-2.5">
                <SearchIcon className="h-4 w-4 shrink-0 text-agro-green" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filtrar por caravana, raza o especie"
                  aria-label="Filtrar animales por caravana"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                El lector RFID no está integrado: la búsqueda filtra por número de caravana.
              </p>
            </div>

            <div className="border-t border-agro-border px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  Animales
                </p>
                <Badge tone="slate">{visible.length}</Badge>
              </div>
            </div>

            {loading ? (
              <ListSkeleton rows={5} />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<LivestockIcon />}
                title={livestocks.length === 0 ? "Todavía no hay animales" : "Sin coincidencias"}
                subtitle={
                  livestocks.length === 0
                    ? "Cuando se registren caravanas van a aparecer acá."
                    : "Probá con otro número de caravana, raza o especie."
                }
              />
            ) : (
              <ul className="divide-y divide-agro-border">
                {visible.map((l) => {
                  const ultimo = eventosActivo.length > 0 && selected?.id === l.id
                    ? eventosActivo[0]
                    : events
                        .filter((e) => e.livestockId === l.id)
                        .sort((a, b) => +new Date(b.eventDate) - +new Date(a.eventDate))[0];
                  const isActive = selected?.id === l.id;
                  return (
                    <li key={l.id} className="stagger-item">
                      <button
                        type="button"
                        onClick={() => setSelectedId(l.id)}
                        aria-current={isActive ? "true" : undefined}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isActive ? "bg-agro-green/5" : "hover:bg-base-subtle"
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-agro-green/15">
                          <span className="text-[11px] font-semibold text-agro-green-deep">TC</span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{l.tagNumber}</p>
                          <p className="truncate text-xs text-ink-faint">
                            {ultimo
                              ? EVENT_TYPE_LABELS[ultimo.type] ?? ultimo.type
                              : "Sin eventos"}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>

        {/* Ficha del animal */}
        <section className="lg:col-span-2">
          {selected ? (
            <>
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-agro-border px-5 py-4">
                  <div className="flex items-center gap-3">
                    <IconTile tone="green">
                      <LivestockIcon />
                    </IconTile>
                    <div>
                      <h3 className="font-semibold text-ink">Caravana {selected.tagNumber}</h3>
                      <p className="text-sm text-ink-soft">
                        {selected.species} · {selected.sex}
                        {selected.breed ? ` · ${selected.breed}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge tone="green">{selected.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-px border-b border-agro-border bg-agro-border lg:grid-cols-4">
                  {[
                    { k: "Peso actual", v: pesoActual !== null ? `${pesoActual} kg` : "—" },
                    {
                      k: "Ganancia media",
                      v: gananciaMedia !== null ? `${gananciaMedia.toFixed(2)} kg/día` : "—",
                    },
                    { k: "Raza", v: selected.breed ?? "—" },
                    { k: "Nacimiento", v: fmtDate(selected.birthDate) },
                  ].map((d) => (
                    <div key={d.k} className="bg-card px-5 py-3.5">
                      <p className="text-xs text-ink-faint">{d.k}</p>
                      <p className="text-base font-bold text-ink">{d.v}</p>
                    </div>
                  ))}
                </div>

                {/* Timeline clínico */}
                <div className="px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                      Historial clínico
                    </p>
                    <Button className="!py-1.5 !text-xs" onClick={openModal}>
                      <PlusIcon className="h-3.5 w-3.5" />
                      Evento sanitario
                    </Button>
                  </div>

                  {eventosActivo.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-agro-border px-3 py-5 text-center text-sm text-ink-soft">
                      Este animal todavía no tiene eventos sanitarios registrados.
                    </p>
                  ) : (
                    <ol className="relative space-y-5 pl-5">
                      <div className="absolute bottom-1 left-[0.45rem] top-1 w-px bg-agro-border" />
                      {eventosActivo.map((ev) => (
                        <li key={ev.id} className="relative">
                          <span
                            className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ${
                              EVENT_TYPE_TONES[ev.type] === "slate"
                                ? "bg-ink-faint"
                                : EVENT_TYPE_TONES[ev.type] === "green"
                                ? "bg-agro-green"
                                : EVENT_TYPE_TONES[ev.type] === "wheat"
                                ? "bg-agro-wheat"
                                : "bg-agro-earth"
                            }`}
                          />
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-ink">
                              {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                            </p>
                            <span className="text-xs text-ink-faint">{fechaCorta(ev.eventDate)}</span>
                          </div>
                          <p className="text-sm text-ink-soft">{ev.observations ?? "Sin detalle"}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </Card>

              {/* Evolución de peso (datos reales de /weight-records) */}
              <Card className="mt-5 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <IconTile tone="wheat" className="h-9 w-9">
                    <ScaleIcon />
                  </IconTile>
                  <div>
                    <p className="text-sm font-semibold text-ink">Evolución de peso</p>
                    <p className="text-xs text-ink-soft">Pesajes registrados de esta caravana</p>
                  </div>
                </div>

                {pesos.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-agro-border px-3 py-5 text-center text-sm text-ink-soft">
                    No hay pesajes registrados para esta caravana.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <StatRow label="Peso inicial" value={`${pesoInicial} kg`} />
                    <StatRow label="Último peso" value={`${pesoActual} kg`} />
                    <StatRow
                      label="Variación total"
                      value={variacion !== null ? `${variacion > 0 ? "+" : ""}${variacion.toFixed(1)} kg` : "—"}
                    />
                    <StatRow
                      label="Ganancia media"
                      value={gananciaMedia !== null ? `${gananciaMedia.toFixed(2)} kg/día` : "—"}
                    />
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card>
              <EmptyState
                icon={<LivestockIcon />}
                title={livestocks.length === 0 ? "Todavía no hay animales" : "Sin coincidencias"}
                subtitle={
                  livestocks.length === 0
                    ? "Cuando se registren caravanas vas a poder ver su ficha clínica acá."
                    : "Ajustá el filtro para encontrar una caravana."
                }
              />
            </Card>
          )}
        </section>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => (submitting ? undefined : setModalOpen(false))}
        title="Nuevo evento sanitario"
        subtitle="Queda asociado a la caravana y al operador de tu sesión."
      >
        <form className="space-y-4" onSubmit={submitEvent}>
          <SelectField
            label="Animal"
            required
            placeholder="Seleccioná un animal"
            options={livestocks.map((l) => ({
              value: l.id,
              label: `${l.tagNumber} · ${l.species}`,
            }))}
            value={form.livestockId}
            onChange={(e) => setForm((f) => ({ ...f, livestockId: e.target.value }))}
            disabled={submitting}
          />
          <SelectField
            label="Tipo de evento"
            required
            placeholder="Seleccioná el tipo"
            options={EVENT_TYPE_OPTIONS}
            value={form.eventType}
            onChange={(e) =>
              setForm((f) => ({ ...f, eventType: e.target.value as LivestockEventType | "" }))
            }
            disabled={submitting}
          />
          <TextField
            label="Fecha"
            type="date"
            required
            value={form.eventDate}
            onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
            disabled={submitting}
          />
          <TextareaField
            label="Observaciones"
            value={form.obs}
            onChange={(e) => setForm((f) => ({ ...f, obs: e.target.value }))}
            placeholder="Detalle del evento, producto aplicado, dosis…"
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
              {submitting ? "Registrando…" : "Registrar evento"}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
