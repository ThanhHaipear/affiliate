function unwrapResponseData(response) {
  return response?.data?.data ?? response?.data;
}

function normalizeRole(role = "") {
  return String(role).toLowerCase();
}

function normalizeRoles(roles = []) {
  return roles.map(normalizeRole);
}

function normalizeAuthPayload(payload = {}) {
  const sourceAccount = payload.account || payload.currentUser || {};
  const roles = normalizeRoles(sourceAccount.roles || payload.roles || []);

  return {
    accessToken: payload.accessToken || "",
    refreshToken: payload.refreshToken || "",
    currentUser: {
      id: sourceAccount.id || null,
      email: sourceAccount.email || "",
      phone: sourceAccount.phone || "",
      status: sourceAccount.status || "PENDING",
      roles,
      profile: sourceAccount.profile || {},
    },
    roles,
  };
}

export { normalizeAuthPayload, normalizeRole, normalizeRoles, unwrapResponseData };
