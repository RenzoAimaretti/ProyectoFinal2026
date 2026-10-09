"use client";

// Controlled form fields with a shared label/hint/error shell.
//
// Every field is a controlled component: pass `value` and `onChange`.
// `className` applies to the control itself. `id` is auto-generated with
// `useId` when omitted, so labels stay associated.

import { useId } from "react";

const inputBase =
  "w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

function inputTone(error?: string): string {
  return error
    ? "border-agro-earth/60 focus:border-agro-earth focus:ring-agro-earth/30"
    : "border-agro-border focus:ring-agro-green/40";
}

export type FieldProps = {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Label + control + hint/error shell. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className = "",
  children,
}: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink-faint">
          {label}
          {required && <span className="ml-0.5 text-agro-earth">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="mt-1.5 text-xs font-medium text-agro-earth-dark">
          {error}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type SharedFieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
};

export type TextFieldProps = SharedFieldProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">;

export function TextField({
  label,
  hint,
  error,
  className = "",
  id,
  required,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required}>
      <input
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputBase} ${inputTone(error)} ${className}`}
        {...rest}
      />
    </Field>
  );
}

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectFieldProps = SharedFieldProps &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
    options: SelectOption[];
    placeholder?: string;
  };

export function SelectField({
  label,
  hint,
  error,
  className = "",
  id,
  required,
  options,
  placeholder,
  ...rest
}: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required}>
      <select
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputBase} ${inputTone(error)} ${className}`}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export type CheckboxGroupProps = {
  label: string;
  hint?: string;
  options: SelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
};

/** Controlled multi-selection with one accessible label per checkbox. */
export function CheckboxGroup({ label, hint, options, values, onChange, disabled = false }: CheckboxGroupProps) {
  const hintId = useId();
  return (
    <fieldset className="space-y-2" aria-describedby={hint ? hintId : undefined} disabled={disabled}>
      <legend className="text-xs font-semibold text-ink-faint">{label}</legend>
      {hint && <p id={hintId} className="text-xs text-ink-soft">{hint}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 rounded-lg border border-agro-border bg-card px-3 py-2.5 text-sm text-ink cursor-pointer focus-within:ring-2 focus-within:ring-agro-green/40">
            <input
              type="checkbox"
              value={option.value}
              checked={values.includes(option.value)}
              disabled={option.disabled}
              onChange={(event) => onChange(event.target.checked
                ? [...values, option.value]
                : values.filter((value) => value !== option.value))}
              className="h-4 w-4 accent-agro-green"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type TextareaFieldProps = SharedFieldProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export function TextareaField({
  label,
  hint,
  error,
  className = "",
  id,
  required,
  rows = 3,
  ...rest
}: TextareaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required}>
      <textarea
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputBase} resize-none ${inputTone(error)} ${className}`}
        {...rest}
      />
    </Field>
  );
}
