import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Input({
  id,
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className,
  disabled,
  required,
  ...props
}: InputProps) {
  const inputId = id || props.name;
  const descriptionId = inputId ? `${inputId}-description` : undefined;
  const errorId = inputId ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-800"
        >
          {label}
          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </label>
      ) : null}

      <div className="relative">
        {leftIcon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            {leftIcon}
          </div>
        ) : null}

        <input
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? descriptionId : undefined}
          className={cn(
            "block h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors",
            "placeholder:text-slate-400",
            "focus:border-[#0F2742] focus:outline-none focus:ring-2 focus:ring-[#0F2742]/15",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/15"
              : "border-slate-300",
            leftIcon ? "pl-10" : "",
            rightIcon ? "pr-10" : "",
            className ?? "",
          )}
          {...props}
        />

        {rightIcon ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            {rightIcon}
          </div>
        ) : null}
      </div>

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

export type { InputProps };