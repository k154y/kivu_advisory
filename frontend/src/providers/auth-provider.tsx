"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";
import {
  clearAuthSession,
  getDashboardPathByRole,
  getRequiredRoleByPath,
  getStoredAuthUser,
  normalizeRole,
  publicAuthPages,
} from "@/lib/auth";
import { endpoints } from "@/lib/endpoints";
import type { AuthenticatedUser, UserRole } from "@/types/api";

type AuthContextValue = {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthenticatedUser | null) => void;
  refreshUser: () => Promise<AuthenticatedUser | null>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUserState] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUser = useCallback((nextUser: AuthenticatedUser | null) => {
    setUserState(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setUserState(null);
    router.replace("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const result = await api.get<AuthenticatedUser>(endpoints.auth.me);

      setUserState(result.data);
      return result.data;
    } catch {
      clearAuthSession();
      setUserState(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const storedUser = getStoredAuthUser();

    if (storedUser) {
      setUserState(storedUser);

      void refreshUser().finally(() => {
        setIsLoading(false);
      });

      return;
    }

    setIsLoading(false);
  }, [refreshUser]);

  useEffect(() => {
    if (isLoading) return;

    const requiredRole = getRequiredRoleByPath(pathname);

    if (requiredRole && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requiredRole && user) {
      const userRole = normalizeRole(user.role);

      if (userRole !== requiredRole) {
        router.replace(getDashboardPathByRole(user.role));
        return;
      }
    }

    if (user && publicAuthPages.some((authPage) => pathname.startsWith(authPage))) {
      router.replace(getDashboardPathByRole(user.role));
    }
  }, [isLoading, pathname, router, user]);

  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => {
      if (!user) return false;

      const userRole = normalizeRole(user.role);

      if (!userRole) return false;

      if (Array.isArray(role)) {
        return role.includes(userRole);
      }

      return userRole === role;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      setUser,
      refreshUser,
      logout,
      hasRole,
    }),
    [hasRole, isLoading, logout, refreshUser, setUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export type { AuthContextValue, AuthProviderProps };