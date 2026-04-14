const API_PREFIX = "/api";

const ENDPOINTS = {
  auth: {
    register: `${API_PREFIX}/auth/register`,
    login: `${API_PREFIX}/auth/login`,
    logout: `${API_PREFIX}/auth/logout`,
    refreshToken: `${API_PREFIX}/auth/refresh-token`,
  },
  users: {
    profile: `${API_PREFIX}/users/profile`,
  },
};

export { API_PREFIX, ENDPOINTS };
