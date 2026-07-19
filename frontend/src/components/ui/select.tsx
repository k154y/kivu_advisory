import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: SelectOption[];
};

export function Select({
  id,
  label,
  error,
  hint,
  placeholder,
  options,
  className,
  disabled,
  required,
  ...props
}: SelectProps) {
  const selectId = id || props.name;
  const descriptionId = selectId ? `${selectId}-description` : undefined;
  const errorId = selectId ? `${selectId}-error` : undefined;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-800"
        >
          {label}
          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </label>
      ) : null}

      <select
        id={selectId}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? descriptionId : undefined}
        className={cn(
          "block h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors",
          "focus:border-[#0F2742] focus:outline-none focus:ring-2 focus:ring-[#0F2742]/15",
          "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/15"
            : "border-slate-300",
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export type { SelectOption, SelectProps };