import { axiosClient } from "./axiosClient";
import { ENDPOINTS } from "./endpoints";
import { normalizeRoles, unwrapResponseData } from "./response";

function normalizeCurrentUser(payload = {}) {
  return {
    id: payload.id || null,
    email: payload.email || "",
    phone: payload.phone || "",
    status: payload.status || "PENDING",
    roles: normalizeRoles(payload.roles || []),
    profile: payload.profile || {},
  };
}

async function getCurrentUserProfile() {
  const response = await axiosClient.get(ENDPOINTS.users.profile);
  return normalizeCurrentUser(unwrapResponseData(response));
}

async function updateCurrentUserProfile(payload) {
  const response = await axiosClient.put(ENDPOINTS.users.profile, payload);
  return normalizeCurrentUser(unwrapResponseData(response));
}

export { getCurrentUserProfile, updateCurrentUserProfile };
