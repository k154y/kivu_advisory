import { api } from "@/lib/api";

export type AccountantStatus = "active" | "inactive" | string;

export type AdminAccountant = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountantListResponse = {
  items: AdminAccountant[];
};

export type AccountantFormState = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
};

export const emptyAccountantForm: AccountantFormState = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  confirm_password: "",
};

export const adminAccountantPaths = {
  list: "/admin/accountants",
  create: "/admin/accountants",
  detail: (id: string) =>
    `/admin/accountants/detail?id=${encodeURIComponent(id)}`,
  status: (id: string) =>
    `/admin/accountants/status?id=${encodeURIComponent(id)}`,
};

export function getAccountantItems(
  data: AccountantListResponse | AdminAccountant[],
) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

export function buildCreateAccountantPayload(form: AccountantFormState) {
  return {
    full_name: form.full_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    password: form.password,
  };
}

export function validateStrongPassword(password: string) {
  const errors: string[] = [];

  if (password.length < 10) {
    errors.push("At least 10 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("At least one number");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("At least one special character");
  }

  return errors;
}

export function formatAccountantDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function loadAccountants() {
  const result = await api.get<AccountantListResponse | AdminAccountant[]>(
    `${adminAccountantPaths.list}?page_size=100`,
  );

  return getAccountantItems(result.data);
}