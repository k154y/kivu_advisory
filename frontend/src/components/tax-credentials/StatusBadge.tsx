import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  active?: boolean;
  label?: string;
};

export function StatusBadge({ active = true, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        active
          ? "border border-teal/20 bg-teal/10 text-teal"
          : "border border-red-100 bg-red-50 text-red-700",
      )}
    >
      {label || (active ? "Active" : "Inactive")}
    </span>
  );
}