"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import { Button, Card, EmptyState, Modal, PageHeader } from "@/components/ui/primitives";
import { DataTable, type DataTableColumn } from "@/components/ui/table";
import { CheckboxGroup, TextField, TextareaField } from "@/components/ui/form";
import { Alert, useToast } from "@/components/ui/feedback";
import { ProductionIcon } from "@/components/ui/icons";
import { navItems } from "@/components/ui/nav";
import { catalogErrorMessage } from "@/api/error-message";
import {
  createLaborType, listInputCategories, listLaborTypeCategories, listLaborTypes,
  replaceLaborTypeCategories, updateLaborType,
  type InputCategoryDTO, type LaborTypeDTO,
} from "@/api/client";

export default function LaboresPage() {
  const toast = useToast();
  const [labors, setLabors] = useState<LaborTypeDTO[]>([]);
  const [categories, setCategories] = useState<InputCategoryDTO[]>([]);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LaborTypeDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LaborTypeDTO | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setVersion((v) => v + 1);
  }, []);
  useEffect(() => {
    let alive = true;
    Promise.all([listLaborTypes(), listInputCategories()])
      .then(([nextLabors, nextCategories]) => {
        if (alive) { setLabors(nextLabors); setCategories(nextCategories); setLoadError(null); }
      })
      .catch((error: unknown) => { if (alive) setLoadError(catalogErrorMessage(error)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [version]);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    listLaborTypeCategories(selected.id)
      .then((assigned) => { if (alive) { setCategoryIds(assigned.map((category) => category.id)); setAssignmentError(null); } })
      .catch((error: unknown) => { if (alive) setAssignmentError(catalogErrorMessage(error)); })
      .finally(() => { if (alive) setAssignmentLoading(false); });
    return () => { alive = false; };
  }, [selected]);

  function openForm(labor: LaborTypeDTO | null) {
    setEditing(labor);
    setName(labor?.name ?? "");
    setDescription(labor?.description ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  async function save() {
    if (busy) return;
    if (!name.trim()) { setFormError("Ingresá el nombre de la labor."); return; }
    setBusy(true);
    setFormError(null);
    try {
      if (editing) await updateLaborType(editing.id, { name: name.trim(), description: description.trim() });
      else await createLaborType({ name: name.trim(), description: description.trim() });
      setFormOpen(false);
      toast.success(editing ? "Labor actualizada" : "Labor creada");
      refresh();
    } catch (error) { setFormError(catalogErrorMessage(error)); }
    finally { setBusy(false); }
  }

  function openCategories(labor: LaborTypeDTO) {
    setCategoryIds([]);
    setAssignmentError(null);
    setAssignmentLoading(true);
    setSelected(labor);
  }

  async function saveCategories() {
    if (!selected || busy || assignmentLoading || assignmentError) return;
    setBusy(true);
    try {
      await replaceLaborTypeCategories(selected.id, categoryIds);
      setSelected(null);
      toast.success("Categorías de la labor actualizadas");
      refresh();
    } catch (error) { setAssignmentError(catalogErrorMessage(error)); }
    finally { setBusy(false); }
  }

  const columns: DataTableColumn<LaborTypeDTO>[] = [
    { key: "name", header: "Labor", render: (row) => <span className="font-medium text-ink">{row.name}</span> },
    { key: "description", header: "Descripción", render: (row) => <span className="text-ink-soft">{row.description || "—"}</span> },
    { key: "actions", header: "Acciones", render: (row) => <div className="flex flex-wrap gap-1"><Button variant="ghost" onClick={() => openForm(row)}>Editar</Button><Button variant="secondary" onClick={() => openCategories(row)}>Categorías</Button></div> },
  ];

  return (
    <DashboardLayout title="Labores" sidebarItems={navItems} breadcrumb="Tipos de labor">
      <PageHeader title="Labores" subtitle="Administrá los tipos de labor y sus categorías de insumos." action={<Button onClick={() => openForm(null)}>Nueva labor</Button>} />
      {loadError && <Alert tone="error" className="mb-5">{loadError} <Button variant="secondary" onClick={refresh}>Reintentar</Button></Alert>}
      <Card className="overflow-hidden"><DataTable columns={columns} data={labors} rowKey={(row) => row.id} loading={loading} emptyState={<EmptyState icon={<ProductionIcon />} title="Sin labores" subtitle="Creá una labor para comenzar." />} /></Card>
      <Modal open={formOpen} onClose={() => { if (!busy) setFormOpen(false); }} title={editing ? "Editar labor" : "Nueva labor"} footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setFormOpen(false)}>Cancelar</Button><Button disabled={busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar"}</Button></div>}>
        <div className="space-y-4">{formError && <Alert tone="error">{formError}</Alert>}<TextField label="Nombre" required value={name} onChange={(event) => setName(event.target.value)} disabled={busy} /><TextareaField label="Descripción" value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy} /></div>
      </Modal>
      <Modal open={Boolean(selected)} onClose={() => { if (!busy) setSelected(null); }} title={`Categorías de ${selected?.name ?? "la labor"}`} subtitle="Definí qué categorías de insumos se pueden usar en esta labor." footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setSelected(null)}>Cancelar</Button><Button disabled={busy || assignmentLoading || Boolean(assignmentError)} onClick={() => void saveCategories()}>{busy ? "Guardando…" : "Guardar categorías"}</Button></div>}>
        <div className="space-y-4">
          {assignmentError && <Alert tone="error">{assignmentError}</Alert>}
          {assignmentLoading ? <p className="text-sm text-ink-soft">Cargando categorías…</p> : <CheckboxGroup label="Categorías permitidas" hint="Si no seleccionás ninguna categoría, la labor no tiene restricciones de insumos." options={categories.map((category) => ({ value: category.id, label: category.name }))} values={categoryIds} onChange={setCategoryIds} disabled={busy} />}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
