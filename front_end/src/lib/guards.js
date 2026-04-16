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
  const currentUser = useAuthStore((state) => state.currentUser);
  const affiliateStatus = currentUser?.profile?.affiliateStatus || null;
  const hasAffiliateRole = roles.includes("affiliate");
  const canAccessAffiliate = hasAffiliateRole || affiliateStatus === "APPROVED";

  if (!hasRequiredRole(roles, allowedRoles)) {
    return React.createElement(Navigate, { to: redirectTo, replace: true });
  }

  if (allowedRoles.includes("affiliate") && !canAccessAffiliate) {
    return React.createElement(Navigate, { to: "/dashboard/customer/affiliate", replace: true });
  }

  return children || React.createElement(Outlet);
}

export { AuthGuard, GuestGuard, RoleGuard, hasRequiredRole, isAuthenticated };
