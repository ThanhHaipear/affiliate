import axios from "axios";
import { ENDPOINTS } from "./endpoints";
import { mockRefreshToken } from "../mock/authMock";
import { normalizeAuthPayload, unwrapResponseData } from "./response";
import { useAuthStore } from "../store/authStore";

const backendHost = import.meta.env.VITE_BACKEND_HOST;
const backendPort = import.meta.env.VITE_BACKEND_PORT || "4000";
const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (backendHost ? `http://${backendHost}:${backendPort}` : "");
const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === "true";

const axiosClient = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshTokenPromise = null;
let roleLockSyncPromise = null;

function isRoleDashboardPath(pathname = "") {
  return pathname.startsWith("/dashboard/customer") || pathname.startsWith("/dashboard/affiliate");
}

async function requestTokenRefresh(refreshToken) {
  if (useMockAuth) {
    return mockRefreshToken(refreshToken);
  }

  const response = await axios.post(
    `${baseURL}${ENDPOINTS.auth.refreshToken}`,
    { refreshToken },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return normalizeAuthPayload(unwrapResponseData(response));
}

axiosClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const authStore = useAuthStore.getState();
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";

    if (
      status === 403 &&
      !originalRequest?._roleLockSync &&
      authStore.refreshToken &&
      isRoleDashboardPath(pathname)
    ) {
      originalRequest._roleLockSync = true;

      try {
        if (!roleLockSyncPromise) {
          roleLockSyncPromise = requestTokenRefresh(authStore.refreshToken).finally(() => {
            roleLockSyncPromise = null;
          });
        }

        const session = await roleLockSyncPromise;

        authStore.setTokens({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        });

        if (session.currentUser) {
          authStore.setUser(session.currentUser);
        }
      } catch (_syncError) {
        // Let the original 403 propagate; auth state will be handled by the refresh failure path elsewhere.
      }

      return Promise.reject(error);
    }

    if (status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    if (!authStore.refreshToken) {
      authStore.logout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshTokenPromise) {
        refreshTokenPromise = requestTokenRefresh(authStore.refreshToken).finally(() => {
          refreshTokenPromise = null;
        });
      }

      const session = await refreshTokenPromise;

      authStore.setTokens({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });

      if (session.currentUser) {
        authStore.setUser(session.currentUser);
      }

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      authStore.logout();
      return Promise.reject(refreshError);
    }
  },
);

export { axiosClient };
