"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/ui/layout";
import { Badge, Button, Card, EmptyState, Modal, PageHeader } from "@/components/ui/primitives";
import { DataTable, type DataTableColumn } from "@/components/ui/table";
import { TextField } from "@/components/ui/form";
import { Alert, useToast } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InputsIcon } from "@/components/ui/icons";
import { navItems } from "@/components/ui/nav";
import { catalogErrorMessage } from "@/api/error-message";
import {
  createInputCategory, deleteInputCategory, listInputCategories, listInputs,
  updateInputCategory, type InputCategoryDTO, type InputDTO,
} from "@/api/client";

export default function CategoriasPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<InputCategoryDTO[]>([]);
  const [inputs, setInputs] = useState<InputDTO[]>([]);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<InputCategoryDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<InputCategoryDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setVersion((v) => v + 1);
  }, []);
  useEffect(() => {
    let alive = true;
    Promise.all([listInputCategories(), listInputs()])
      .then(([nextCategories, nextInputs]) => {
        if (alive) { setCategories(nextCategories); setInputs(nextInputs); setLoadError(null); }
      })
      .catch((error: unknown) => { if (alive) setLoadError(catalogErrorMessage(error)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [version]);

  function openForm(category: InputCategoryDTO | null) {
    setEditing(category);
    setName(category?.name ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  async function save() {
    if (busy) return;
    if (!name.trim()) { setFormError("Ingresá el nombre de la categoría."); return; }
    setBusy(true);
    setFormError(null);
    try {
      if (editing) await updateInputCategory(editing.id, { name: name.trim() });
      else await createInputCategory({ name: name.trim() });
      setFormOpen(false);
      toast.success(editing ? "Categoría actualizada" : "Categoría creada");
      refresh();
    } catch (error) { setFormError(catalogErrorMessage(error)); }
    finally { setBusy(false); }
  }

  async function toggle(category: InputCategoryDTO) {
    if (busy) return;
    setBusy(true);
    try {
      await updateInputCategory(category.id, { active: !category.active });
      toast.success(category.active ? "Categoría desactivada" : "Categoría activada");
      refresh();
    } catch (error) { toast.error(catalogErrorMessage(error)); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await deleteInputCategory(deleting.id);
      setDeleting(null);
      toast.success("Categoría eliminada");
      refresh();
    } catch (error) {
      // In particular, a 409 carries the reason why an in-use category cannot be removed.
      setDeleting(null);
      toast.error(catalogErrorMessage(error));
    } finally { setBusy(false); }
  }

  const columns: DataTableColumn<InputCategoryDTO>[] = [
    { key: "name", header: "Nombre", render: (row) => <span className="font-medium text-ink">{row.name}</span> },
    { key: "active", header: "Estado", render: (row) => <Badge tone={row.active ? "green" : "slate"}>{row.active ? "Activa" : "Inactiva"}</Badge> },
    { key: "inputs", header: "Insumos", render: (row) => <span className="text-ink-soft">{inputs.filter((input) => input.categoryId === row.id).length}</span> },
    { key: "actions", header: "Acciones", render: (row) => (
      <div className="flex flex-wrap gap-1">
        <Button variant="ghost" disabled={busy} onClick={() => openForm(row)}>Renombrar</Button>
        <Button variant="ghost" disabled={busy} onClick={() => void toggle(row)}>{row.active ? "Desactivar" : "Activar"}</Button>
        <Button variant="danger" disabled={busy} onClick={() => setDeleting(row)}>Eliminar</Button>
      </div>
    ) },
  ];

  return (
    <DashboardLayout title="Categorías" sidebarItems={navItems} breadcrumb="Catálogo de insumos">
      <PageHeader title="Categorías" subtitle="Organizá los insumos por categoría." action={<Button onClick={() => openForm(null)}>Nueva categoría</Button>} />
      {loadError && <Alert tone="error" className="mb-5">{loadError} <Button variant="secondary" onClick={refresh}>Reintentar</Button></Alert>}
      <Card className="overflow-hidden">
        <DataTable columns={columns} data={categories} rowKey={(row) => row.id} loading={loading} emptyState={<EmptyState icon={<InputsIcon />} title="Sin categorías" subtitle="Creá una categoría para organizar los insumos." />} />
      </Card>
      <Modal open={formOpen} onClose={() => { if (!busy) setFormOpen(false); }} title={editing ? "Renombrar categoría" : "Nueva categoría"} footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setFormOpen(false)}>Cancelar</Button><Button disabled={busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar"}</Button></div>}>
        <div className="space-y-4">{formError && <Alert tone="error">{formError}</Alert>}<TextField label="Nombre" required value={name} onChange={(event) => setName(event.target.value)} disabled={busy} /></div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={() => void remove()} title="Eliminar categoría" message={`¿Querés eliminar la categoría ${deleting?.name ?? ""}? Esta acción no se puede deshacer.`} confirmLabel="Eliminar" loading={busy} />
    </DashboardLayout>
  );
}
