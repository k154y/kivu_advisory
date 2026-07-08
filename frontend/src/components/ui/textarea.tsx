import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Textarea({
  id,
  label,
  error,
  hint,
  className,
  disabled,
  required,
  rows = 4,
  ...props
}: TextareaProps) {
  const textareaId = id || props.name;
  const descriptionId = textareaId ? `${textareaId}-description` : undefined;
  const errorId = textareaId ? `${textareaId}-error` : undefined;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-slate-800"
        >
          {label}
          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </label>
      ) : null}

      <textarea
        id={textareaId}
        disabled={disabled}
        required={required}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? descriptionId : undefined}
        className={cn(
          "block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors",
          "placeholder:text-slate-400",
          "focus:border-[#0F2742] focus:outline-none focus:ring-2 focus:ring-[#0F2742]/15",
          "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/15"
            : "border-slate-300",
          className,
        )}
        {...props}
      />

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

export type { TextareaProps };