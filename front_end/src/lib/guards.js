import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function isAuthenticated(accessToken) {
  return Boolean(accessToken);
}

function hasRequiredRole(userRoles = [], requiredRoles = []) {
  if (!requiredRoles.length) {
    return true;
  }

  return requiredRoles.some((role) => userRoles.includes(role));
}

function GuestGuard({ children, redirectTo = "/dashboard" }) {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (isAuthenticated(accessToken)) {
    return React.createElement(Navigate, { to: redirectTo, replace: true });
  }

  return children || React.createElement(Outlet);
}

function AuthGuard({
  children,
  redirectTo = "/auth/login",
  redirectStateKey = "from",
}) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!isAuthenticated(accessToken)) {
    return React.createElement(Navigate, {
      to: redirectTo,
      replace: true,
      state: {
        [redirectStateKey]: location,
      },
    });
  }

  return children || React.createElement(Outlet);
}

function RoleGuard({
  children,
  allowedRoles = [],
  redirectTo = "/unauthorized",
}) {
  const roles = useAuthStore((state) => state.roles);

  if (!hasRequiredRole(roles, allowedRoles)) {
    return React.createElement(Navigate, { to: redirectTo, replace: true });
  }

  return children || React.createElement(Outlet);
}

export { AuthGuard, GuestGuard, RoleGuard, hasRequiredRole, isAuthenticated };
