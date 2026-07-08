import type { AuthenticatedUser, UserRole } from "@/types/api";
import { tokenStorage } from "@/lib/api";

export const USER_ROLES = {
  admin: "admin",
  client: "client",
  accountant: "accountant",
} as const satisfies Record<UserRole, UserRole>;

export const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  client: "Client",
  accountant: "Accountant",
};

export const roleDashboardPaths: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  client: "/client/dashboard",
  accountant: "/accountant/dashboard",
};

export const protectedRoutePrefixes: Record<UserRole, string> = {
  admin: "/admin",
  client: "/client",
  accountant: "/accountant",
};

export const publicAuthPages = ["/login", "/register"] as const;

export const normalizeRole = (role?: string | null): UserRole | null => {
  if (!role) return null;

  const normalizedRole = role.trim().toLowerCase();

  if (
    normalizedRole === USER_ROLES.admin ||
    normalizedRole === USER_ROLES.client ||
    normalizedRole === USER_ROLES.accountant
  ) {
    return normalizedRole;
  }

  return null;
};

export const isUserRole = (value: unknown): value is UserRole => {
  return (
    value === USER_ROLES.admin ||
    value === USER_ROLES.client ||
    value === USER_ROLES.accountant
  );
};

export const isAuthenticatedUser = (
  value: unknown,
): value is AuthenticatedUser => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Partial<AuthenticatedUser>;

  return (
    typeof user.id === "string" &&
    typeof user.full_name === "string" &&
    typeof user.email === "string" &&
    typeof user.role === "string" &&
    normalizeRole(user.role) !== null &&
    typeof user.is_active === "boolean"
  );
};

export const getDashboardPathByRole = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return "/login";
  }

  return roleDashboardPaths[normalizedRole];
};

export const getRoleLabel = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return "User";
  }

  return roleLabels[normalizedRole];
};

export const getStoredAuthUser = (): AuthenticatedUser | null => {
  const storedUser = tokenStorage.getUser();

  if (!isAuthenticatedUser(storedUser)) {
    return null;
  }

  return {
    ...storedUser,
    role: normalizeRole(storedUser.role) as UserRole,
  };
};

export const hasStoredAccessToken = () => {
  return Boolean(tokenStorage.getAccessToken());
};

export const clearAuthSession = () => {
  tokenStorage.clear();
};

export const getRequiredRoleByPath = (pathname: string): UserRole | null => {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return USER_ROLES.admin;
  }

  if (pathname === "/client" || pathname.startsWith("/client/")) {
    return USER_ROLES.client;
  }

  if (pathname === "/accountant" || pathname.startsWith("/accountant/")) {
    return USER_ROLES.accountant;
  }

  return null;
};

export const isProtectedPath = (pathname: string) => {
  return getRequiredRoleByPath(pathname) !== null;
};

export const canUserAccessPath = (
  user: AuthenticatedUser | null | undefined,
  pathname: string,
) => {
  const requiredRole = getRequiredRoleByPath(pathname);

  if (!requiredRole) {
    return true;
  }

  if (!user || !user.is_active) {
    return false;
  }

  return normalizeRole(user.role) === requiredRole;
};

export const getLoginRedirectPath = (
  user: AuthenticatedUser | null | undefined,
) => {
  if (!user || !user.is_active) {
    return "/login";
  }

  return getDashboardPathByRole(user.role);
};

export const getUnauthorizedRedirectPath = (pathname: string) => {
  const encodedPath = encodeURIComponent(pathname);
  return `/login?next=${encodedPath}`;
};

export const getRoleMismatchRedirectPath = (
  user: AuthenticatedUser | null | undefined,
) => {
  if (!user) {
    return "/login";
  }

  return getDashboardPathByRole(user.role);
};

export const isAdmin = (user: AuthenticatedUser | null | undefined) => {
  return normalizeRole(user?.role) === USER_ROLES.admin;
};

export const isClient = (user: AuthenticatedUser | null | undefined) => {
  return normalizeRole(user?.role) === USER_ROLES.client;
};

export const isAccountant = (user: AuthenticatedUser | null | undefined) => {
  return normalizeRole(user?.role) === USER_ROLES.accountant;
};

export const shouldRedirectAwayFromAuthPage = (
  pathname: string,
  user: AuthenticatedUser | null | undefined,
) => {
  if (!user || !user.is_active) {
    return false;
  }

  return publicAuthPages.some((authPage) => pathname.startsWith(authPage));
};