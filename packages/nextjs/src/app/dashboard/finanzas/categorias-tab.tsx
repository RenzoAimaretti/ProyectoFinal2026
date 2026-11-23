"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, useToast } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, Button, Card, CardHeader, EmptyState, Modal } from "@/components/ui/primitives";
import { Table, Td, Th } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FinanceIcon } from "@/components/ui/icons";
import {
  createExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
  type ExpenseCategoryDTO,
} from "@/api/client";
import { describeFinanceError, isConflict } from "./finance-errors";

export function CategoriasTab() {
  const { success, error: toastError } = useToast();

  const [categories, setCategories] = useState<ExpenseCategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [renaming, setRenaming] = useState<ExpenseCategoryDTO | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);

  const [removing, setRemoving] = useState<ExpenseCategoryDTO | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);
  // A category in use cannot be deleted: the user is offered to deactivate it.
  const [offerDeactivate, setOfferDeactivate] = useState<ExpenseCategoryDTO | null>(null);
  const [deactivateBusy, setDeactivateBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setCategories(await getExpenseCategories());
    } catch (err) {
      setLoadError(describeFinanceError(err, "No se pudieron cargar las categorías"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (name === "") {
      setCreateError("Ingresá el nombre de la categoría.");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      await createExpenseCategory(name);
      setNewName("");
      success("Categoría creada.", "Categorías");
      await load();
    } catch (err) {
      setCreateError(describeFinanceError(err, "No se pudo crear la categoría"));
    } finally {
      setCreating(false);
    }
  };

  const openRename = (category: ExpenseCategoryDTO) => {
    setRenaming(category);
    setRenameValue(category.name);
    setRenameError(null);
  };

  const submitRename = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!renaming) return;
    const name = renameValue.trim();
    if (name === "") {
      setRenameError("Ingresá el nombre de la categoría.");
      return;
    }
    setRenameBusy(true);
    try {
      await updateExpenseCategory(renaming.id, { name });
      success("Categoría actualizada.", "Categorías");
      setRenaming(null);
      await load();
    } catch (err) {
      setRenameError(describeFinanceError(err, "No se pudo renombrar la categoría"));
    } finally {
      setRenameBusy(false);
    }
  };

  const toggleActive = async (category: ExpenseCategoryDTO) => {
    try {
      await updateExpenseCategory(category.id, { active: !category.active });
      success(category.active ? "Categoría desactivada." : "Categoría activada.", "Categorías");
      await load();
    } catch (err) {
      toastError(describeFinanceError(err, "No se pudo cambiar el estado"), "Categorías");
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setRemovingBusy(true);
    try {
      await deleteExpenseCategory(removing.id);
      success("Categoría eliminada.", "Categorías");
      setRemoving(null);
      await load();
    } catch (err) {
      const category = removing;
      setRemoving(null);
      if (isConflict(err)) {
        setOfferDeactivate(category);
      } else {
        toastError(describeFinanceError(err, "No se pudo eliminar la categoría"), "Categorías");
      }
    } finally {
      setRemovingBusy(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!offerDeactivate) return;
    setDeactivateBusy(true);
    try {
      await updateExpenseCategory(offerDeactivate.id, { active: false });
      success("Categoría desactivada. Los gastos existentes la conservan.", "Categorías");
      setOfferDeactivate(null);
      await load();
    } catch (err) {
      toastError(describeFinanceError(err, "No se pudo desactivar la categoría"), "Categorías");
    } finally {
      setDeactivateBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert tone="info" title="Categorías de gasto">
        Las categorías son compartidas por todas las firmas del tenant. Una categoría con gastos asociados no se
        puede eliminar: marcala como inactiva para que no se use en gastos nuevos.
      </Alert>

      {loadError && (
        <Alert tone="error" title="No se pudieron cargar las categorías">
          {loadError}
        </Alert>
      )}

      <Card>
        <CardHeader title="Categorías" subtitle="Nombre único dentro del tenant." />
        <div className="space-y-4 p-4">
          <form className="flex flex-wrap items-start gap-3" onSubmit={create}>
            <div className="min-w-56 flex-1">
              <TextField
                label="Nueva categoría"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Flete"
                error={createError ?? undefined}
                disabled={creating}
              />
            </div>
            <div className="pt-[1.375rem]">
              <Button type="submit" disabled={creating}>
                {creating ? "Creando…" : "Agregar"}
              </Button>
            </div>
          </form>

          {loading ? (
            <TableSkeleton rows={4} columns={3} />
          ) : categories.length === 0 ? (
            <EmptyState
              icon={<FinanceIcon />}
              title="Sin categorías"
              subtitle="Creá la primera categoría para poder cargar gastos."
            />
          ) : (
            <Table>
              <thead className="bg-base-subtle text-xs text-ink-soft">
                <tr>
                  <Th>Nombre</Th>
                  <Th>Estado</Th>
                  <Th align="right">Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-agro-border">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <Td className="font-medium text-ink">{category.name}</Td>
                    <Td>
                      <Badge tone={category.active ? "green" : "slate"}>
                        {category.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => openRename(category)}>
                          Renombrar
                        </Button>
                        <Button variant="secondary" onClick={() => void toggleActive(category)}>
                          {category.active ? "Desactivar" : "Activar"}
                        </Button>
                        <Button variant="ghost" onClick={() => setRemoving(category)}>
                          Eliminar
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Card>

      <Modal
        open={renaming !== null}
        onClose={() => !renameBusy && setRenaming(null)}
        title="Renombrar categoría"
        widthClass="max-w-md"
      >
        <form className="space-y-4" onSubmit={submitRename}>
          <TextField
            label="Nombre"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            error={renameError ?? undefined}
            disabled={renameBusy}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRenaming(null)} disabled={renameBusy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={renameBusy}>
              {renameBusy ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => void confirmRemove()}
        title="Eliminar categoría"
        message={removing ? `Se elimina la categoría "${removing.name}".` : ""}
        confirmLabel="Eliminar"
        loading={removingBusy}
      />

      <ConfirmDialog
        open={offerDeactivate !== null}
        onClose={() => setOfferDeactivate(null)}
        onConfirm={() => void confirmDeactivate()}
        title="La categoría está en uso"
        message={
          offerDeactivate
            ? `"${offerDeactivate.name}" tiene gastos asociados y no se puede eliminar. ¿Querés marcarla como inactiva? Los gastos existentes la conservan.`
            : ""
        }
        confirmLabel="Marcar como inactiva"
        tone="primary"
        loading={deactivateBusy}
      />
    </div>
  );
}
