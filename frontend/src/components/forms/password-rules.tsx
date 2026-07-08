import { cn } from "@/lib/utils";

type PasswordRulesProps = {
  password?: string;
};

const getRules = (password = "") => [
  {
    label: "At least 10 characters",
    passed: password.length >= 10,
  },
  {
    label: "At least one uppercase letter",
    passed: /[A-Z]/.test(password),
  },
  {
    label: "At least one lowercase letter",
    passed: /[a-z]/.test(password),
  },
  {
    label: "At least one number",
    passed: /[0-9]/.test(password),
  },
  {
    label: "At least one special character",
    passed: /[^A-Za-z0-9]/.test(password),
  },
];

export function PasswordRules({ password }: PasswordRulesProps) {
  const rules = getRules(password);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-medium text-slate-800">
        Password requirements
      </p>

      <ul className="mt-2 space-y-1.5">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-2 text-sm",
              rule.passed ? "text-emerald-700" : "text-slate-500",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                rule.passed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-500",
              )}
            >
              {rule.passed ? "✓" : "•"}
            </span>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export type { PasswordRulesProps };