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

    if (!pathname.startsWith("/login")) {
      router.replace("/login");
    }
  }, [pathname, router]);

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
    let cancelled = false;

    const loadSession = async () => {
      const storedUser = getStoredAuthUser();

      if (!storedUser) {
        if (!cancelled) {
          setUserState(null);
          setIsLoading(false);
        }

        return;
      }

      if (!cancelled) {
        setUserState(storedUser);
      }

      try {
        await refreshUser();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  useEffect(() => {
    if (isLoading) return;

    const requiredRole = getRequiredRoleByPath(pathname);

    if (!requiredRole) {
      return;
    }

    if (!user) {
      const loginPath = `/login?next=${encodeURIComponent(pathname)}`;

      if (pathname !== "/login") {
        router.replace(loginPath);
      }

      return;
    }

    const userRole = normalizeRole(user.role);

    if (userRole !== requiredRole) {
      const correctDashboardPath = getDashboardPathByRole(user.role);

      if (pathname !== correctDashboardPath) {
        router.replace(correctDashboardPath);
      }
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