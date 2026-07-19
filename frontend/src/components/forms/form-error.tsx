type FormErrorProps = {
  message?: string;
  details?: unknown;
};

const getDetailItems = (details: unknown) => {
  if (!details || typeof details !== "object") {
    return [];
  }

  return Object.entries(details as Record<string, unknown>).map(
    ([field, value]) => {
      if (Array.isArray(value)) {
        return `${field}: ${value.join(", ")}`;
      }

      if (typeof value === "string") {
        return `${field}: ${value}`;
      }

      return `${field}: ${JSON.stringify(value)}`;
    },
  );
};

export function FormError({ message, details }: FormErrorProps) {
  const detailItems = getDetailItems(details);

  if (!message && detailItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message ? <p className="font-medium">{message}</p> : null}

      {detailItems.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {detailItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type { FormErrorProps };