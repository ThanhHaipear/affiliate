import axios from "axios";
import { ENDPOINTS } from "./endpoints";
import { mockRefreshToken } from "../mock/authMock";
import { normalizeAuthPayload, unwrapResponseData } from "./response";
import { useAuthStore } from "../store/authStore";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === "true";

const axiosClient = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshTokenPromise = null;

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
