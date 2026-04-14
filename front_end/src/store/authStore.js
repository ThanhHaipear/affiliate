import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const AUTH_STORAGE_KEY = "affiliate-platform-auth";

const defaultUser = null;

const resolveDashboardRole = (roles = [], preferredRole = null) => {
  if (preferredRole && roles.includes(preferredRole)) {
    return preferredRole;
  }

  return roles[0] || null;
};

const resolveAuthStorage = () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage access issues and keep session-scoped auth when possible.
  }

  return window.sessionStorage;
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: "",
      refreshToken: "",
      currentUser: defaultUser,
      roles: [],
      activeDashboardRole: null,
      login: ({ accessToken, refreshToken, currentUser, roles }) => {
        const nextRoles = roles || currentUser?.roles || [];

        set({
          accessToken: accessToken || "",
          refreshToken: refreshToken || "",
          currentUser: currentUser || defaultUser,
          roles: nextRoles,
          activeDashboardRole: resolveDashboardRole(nextRoles, get().activeDashboardRole),
        });
      },
      logout: () => {
        set({
          accessToken: "",
          refreshToken: "",
          currentUser: defaultUser,
          roles: [],
          activeDashboardRole: null,
        });
      },
      setTokens: ({ accessToken, refreshToken }) => {
        set((state) => ({
          accessToken: accessToken ?? state.accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        }));
      },
      setUser: (currentUser) => {
        const nextRoles = currentUser?.roles || [];

        set((state) => ({
          currentUser,
          roles: nextRoles,
          activeDashboardRole: resolveDashboardRole(nextRoles, state.activeDashboardRole),
        }));
      },
      setActiveDashboardRole: (role) => {
        const roles = get().roles || [];
        if (!roles.includes(role)) {
          return;
        }

        set({ activeDashboardRole: role });
      },
      hasRole: (role) => {
        const roles = get().roles || [];
        return roles.includes(role);
      },
      hasAnyRole: (requiredRoles = []) => {
        const roles = get().roles || [];
        if (!requiredRoles.length) {
          return true;
        }

        return requiredRoles.some((role) => roles.includes(role));
      },
      isAuthenticated: () => {
        return Boolean(get().accessToken);
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(resolveAuthStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        currentUser: state.currentUser,
        roles: state.roles,
        activeDashboardRole: state.activeDashboardRole,
      }),
    },
  ),
);

export { AUTH_STORAGE_KEY, useAuthStore };