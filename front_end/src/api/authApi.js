import { axiosClient } from "./axiosClient";
import { ENDPOINTS } from "./endpoints";
import {
  mockGetCurrentUser,
  mockLogin,
  mockLogout,
  mockRefreshToken,
} from "../mock/authMock";
import { normalizeAuthPayload, unwrapResponseData } from "./response";
import { useAuthStore } from "../store/authStore";

const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === "true";

async function register(payload) {
  if (useMockAuth) {
    return mockLogin({
      email: payload.email,
      password: payload.password,
    });
  }

  const response = await axiosClient.post(ENDPOINTS.auth.register, payload);
  return normalizeAuthPayload(unwrapResponseData(response));
}

async function login(payload) {
  if (useMockAuth) {
    return mockLogin(payload);
  }

  const response = await axiosClient.post(ENDPOINTS.auth.login, payload);
  return normalizeAuthPayload(unwrapResponseData(response));
}

async function logout(payload) {
  if (useMockAuth) {
    return mockLogout(payload);
  }

  const response = await axiosClient.post(ENDPOINTS.auth.logout, payload);
  return unwrapResponseData(response);
}

async function refreshSession(payload) {
  if (useMockAuth) {
    return mockRefreshToken(payload?.refreshToken);
  }

  const response = await axiosClient.post(ENDPOINTS.auth.refreshToken, payload);
  return normalizeAuthPayload(unwrapResponseData(response));
}

async function getCurrentUser() {
  if (useMockAuth) {
    const token = useAuthStore.getState().accessToken;
    return mockGetCurrentUser(token);
  }

  const { currentUser } = useAuthStore.getState();
  return currentUser;
}

async function forgotPassword(payload) {
  const response = await axiosClient.post(ENDPOINTS.auth.forgotPassword, payload);
  return unwrapResponseData(response);
}

async function changePassword(payload) {
  const response = await axiosClient.post(ENDPOINTS.auth.changePassword, payload);
  return unwrapResponseData(response);
}

async function enrollAffiliate(payload) {
  const response = await axiosClient.post(ENDPOINTS.auth.enrollAffiliate, payload);
  return normalizeAuthPayload(unwrapResponseData(response));
}

export { changePassword, enrollAffiliate, forgotPassword, getCurrentUser, login, logout, refreshSession, register };
