"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/ui/form";
import { NEW_MACHINE_TYPE_OPTION } from "./metrics";

type MachineTypeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label?: string;
  ariaLabel?: string;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
};

/**
 * Selector de tipo de máquina con opción «Otro tipo…».
 *
 * Los tipos habituales y los ya usados se eligen de la lista; «Otro tipo…»
 * habilita un campo de texto para dar de alta uno nuevo, que desde ese momento
 * aparece también en la lista. El valor informado al padre es siempre el tipo
 * efectivo (nunca el centinela). Montá el componente con una `key` distinta al
 * abrir un formulario para que el modo «nuevo» arranque limpio.
 */
export function MachineTypeSelect({
  value,
  onChange,
  options,
  label = "Tipo de máquina",
  ariaLabel,
  required = false,
  allowEmpty = false,
  emptyLabel = "Sin tipo",
  disabled = false,
}: MachineTypeSelectProps) {
  const [newTypeMode, setNewTypeMode] = useState(false);
  const unknownValue = value !== "" && !options.includes(value);
  const writingNewType = newTypeMode || unknownValue;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <SelectField
        label={label}
        aria-label={ariaLabel}
        required={required && !writingNewType}
        disabled={disabled}
        value={writingNewType ? NEW_MACHINE_TYPE_OPTION : value}
        options={[
          ...(allowEmpty ? [{ value: "", label: emptyLabel }] : []),
          ...options.map((type) => ({ value: type, label: type })),
          { value: NEW_MACHINE_TYPE_OPTION, label: "Otro tipo…" },
        ]}
        onChange={(event) => {
          const next = event.target.value;
          if (next === NEW_MACHINE_TYPE_OPTION) {
            setNewTypeMode(true);
            onChange("");
            return;
          }
          setNewTypeMode(false);
          onChange(next);
        }}
      />
      {writingNewType && (
        <TextField
          label="Nuevo tipo"
          aria-label="Nuevo tipo de máquina"
          required={required}
          disabled={disabled}
          placeholder="Ej: Mixer"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
