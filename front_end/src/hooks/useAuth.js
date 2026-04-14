import { login as loginRequest, logout as logoutRequest } from "../api/authApi";
import { useAuthStore } from "../store/authStore";

function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const currentUser = useAuthStore((state) => state.currentUser);
  const roles = useAuthStore((state) => state.roles);
  const activeDashboardRole = useAuthStore((state) => state.activeDashboardRole);
  const loginStore = useAuthStore((state) => state.login);
  const logoutStore = useAuthStore((state) => state.logout);
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const setActiveDashboardRole = useAuthStore((state) => state.setActiveDashboardRole);

  const login = async (payload) => {
    const session = await loginRequest(payload);
    loginStore(session);
    return session;
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await logoutRequest({ refreshToken });
      }
    } finally {
      logoutStore();
    }
  };

  return {
    accessToken,
    refreshToken,
    currentUser,
    roles,
    activeDashboardRole,
    isAuthenticated: Boolean(accessToken),
    isAdmin: roles.includes("admin"),
    isSeller: roles.includes("seller"),
    isAffiliate: roles.includes("affiliate"),
    isCustomer: roles.includes("customer"),
    login,
    logout,
    setTokens,
    setUser,
    setActiveDashboardRole,
  };
}

export { useAuth };
