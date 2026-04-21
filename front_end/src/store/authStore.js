import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const AUTH_STORAGE_KEY = "affiliate-platform-auth";

const defaultUser = null;

const getDashboardCapabilities = (currentUser = null, roles = []) => {
  const normalizedRoles = roles || currentUser?.roles || [];
  const profile = currentUser?.profile || {};

  return {
    admin: normalizedRoles.includes("admin"),
    seller: normalizedRoles.includes("seller"),
    customer: normalizedRoles.includes("customer") || Boolean(profile.hasCustomerCapability),
    affiliate: normalizedRoles.includes("affiliate") || Boolean(profile.hasAffiliateCapability || profile.hasAffiliateApplication),
  };
};

const resolveDashboardRole = (currentUser = null, roles = [], preferredRole = null) => {
  const capabilities = getDashboardCapabilities(currentUser, roles);

  if (preferredRole && capabilities[preferredRole]) {
    return preferredRole;
  }

  return ["customer", "affiliate", "seller", "admin"].find((role) => capabilities[role]) || null;
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
          activeDashboardRole: resolveDashboardRole(currentUser, nextRoles, get().activeDashboardRole),
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
          activeDashboardRole: resolveDashboardRole(currentUser, nextRoles, state.activeDashboardRole),
        }));
      },
      setActiveDashboardRole: (role) => {
        const state = get();
        const capabilities = getDashboardCapabilities(state.currentUser, state.roles);
        if (!capabilities[role]) {
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

export { AUTH_STORAGE_KEY, getDashboardCapabilities, resolveDashboardRole, useAuthStore };
