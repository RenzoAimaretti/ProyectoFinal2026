"use client";

import { useState, type FormEvent } from "react";
import { apiPost, type ClientDTO } from "@/api/client";
import { Alert } from "@/components/ui/feedback";
import { SelectField, TextareaField, TextField } from "@/components/ui/form";
import { Button, Modal } from "@/components/ui/primitives";

type FormCallbacks = { onClose: () => void; onCreated: () => void; describeError: (error: unknown) => string };
type LineItem = { key: number; taskId: string; description: string; quantity: string; unitPrice: string };
const newItem = (key: number): LineItem => ({ key, taskId: "", description: "", quantity: "1", unitPrice: "" });

export function CreateInvoiceForm({ clients, onClose, onCreated, describeError }: FormCallbacks & { clients: ClientDTO[] }) {
  const [clientId, setClientId] = useState("");
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([newItem(0)]);
  const [nextKey, setNextKey] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateItem = (key: number, changes: Partial<LineItem>) => {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item));
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setError(null);
    if (!clientId || !clients.some((client) => client.id === clientId)) {
      setError("Seleccioná un cliente.");
      return;
    }
    if (!items.length) {
      setError("Agregá al menos un concepto.");
      return;
    }
    if (items.some((item) => !item.description.trim() || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 ||
      !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) <= 0)) {
      setError("Cada concepto necesita una descripción, cantidad y precio unitario mayores a cero.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/invoices", {
        clientId, number: number.trim(), issueDate,
        ...(dueDate ? { dueDate } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: items.map((item) => ({
          description: item.description.trim(), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice),
          ...(item.taskId.trim() ? { taskId: item.taskId.trim() } : {}),
        })),
      });
      onCreated();
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={saving ? () => undefined : onClose} title="Nueva factura" subtitle="Facturá servicios a un cliente de esta firma." widthClass="max-w-2xl">
      <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
        {error && <Alert tone="error" onDismiss={() => setError(null)}>{error}</Alert>}
        <SelectField label="Cliente" required value={clientId} onChange={(event) => setClientId(event.target.value)}
          placeholder="Seleccioná un cliente" options={clients.map((client) => ({ value: client.id, label: client.name }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Número" required value={number} onChange={(event) => setNumber(event.target.value)} />
          <TextField label="Fecha de emisión" type="date" required value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
          <TextField label="Vencimiento (opcional)" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <TextareaField label="Notas (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <div className="flex items-center justify-between gap-3 border-t border-agro-border pt-4">
          <h4 className="text-sm font-semibold text-ink">Conceptos</h4>
          <Button variant="secondary" onClick={() => { setItems((current) => [...current, newItem(nextKey)]); setNextKey((key) => key + 1); }}>Agregar concepto</Button>
        </div>
        {items.map((item, index) => (
          <div key={item.key} className="space-y-3 rounded-lg border border-agro-border bg-base-subtle/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Concepto {index + 1}</span>
              <Button variant="ghost" onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}>Quitar</Button>
            </div>
            <TextField label="Tarea (opcional)" hint="ID de una tarea de este cliente" value={item.taskId} onChange={(event) => updateItem(item.key, { taskId: event.target.value })} />
            <TextField label="Descripción" required value={item.description} onChange={(event) => updateItem(item.key, { description: event.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Cantidad" type="number" min="0.01" step="any" required value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: event.target.value })} />
              <TextField label="Precio unitario" type="number" min="0.01" step="any" required value={item.unitPrice} onChange={(event) => updateItem(item.key, { unitPrice: event.target.value })} />
            </div>
          </div>
        ))}
        <div className="flex justify-end gap-2 border-t border-agro-border pt-4">
          <Button variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear factura"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function CreateChequeForm({ onClose, onCreated, describeError }: FormCallbacks) {
  const [number, setNumber] = useState("");
  const [issuer, setIssuer] = useState("");
  const [bank, setBank] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      await apiPost("/cheques", {
        number: number.trim(), issuer: issuer.trim(), dueDate, amount: Number(amount),
        ...(bank.trim() ? { bank: bank.trim() } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onCreated();
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open onClose={saving ? () => undefined : onClose} title="Nuevo cheque" subtitle="Registrá un cheque físico de esta firma.">
      <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
        {error && <Alert tone="error" onDismiss={() => setError(null)}>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Número" required value={number} onChange={(event) => setNumber(event.target.value)} />
          <TextField label="Emisor" required value={issuer} onChange={(event) => setIssuer(event.target.value)} />
          <TextField label="Banco (opcional)" value={bank} onChange={(event) => setBank(event.target.value)} />
          <TextField label="Importe" type="number" min="0.01" step="any" required value={amount} onChange={(event) => setAmount(event.target.value)} />
          <TextField label="Vencimiento" type="date" required value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <TextareaField label="Notas (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <div className="flex justify-end gap-2 border-t border-agro-border pt-4">
          <Button variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear cheque"}</Button>
        </div>
      </form>
    </Modal>
  );
}
