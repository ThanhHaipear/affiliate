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
  const currentUser = useAuthStore((state) => state.currentUser);

  if (!isAuthenticated(accessToken)) {
    return React.createElement(Navigate, {
      to: redirectTo,
      replace: true,
      state: {
        [redirectStateKey]: location,
      },
    });
  }

  if (currentUser?.status === "LOCKED") {
    return React.createElement(Navigate, {
      to: "/unauthorized",
      replace: true,
      state: {
        reason: "locked",
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
  const affiliateLocked = Boolean(currentUser?.profile?.affiliateLocked || currentUser?.profile?.affiliateActivityStatus === "LOCKED");
  const customerLocked = Boolean(currentUser?.profile?.customerLocked);
  const hasCustomerCapability = Boolean(currentUser?.profile?.hasCustomerCapability);
  const hasAffiliateCapability = Boolean(currentUser?.profile?.hasAffiliateCapability || currentUser?.profile?.hasAffiliateApplication);
  const hasAffiliateRole = roles.includes("affiliate");
  const canAccessAffiliate = hasAffiliateRole || affiliateStatus === "APPROVED";
  const canAccessLockedCustomer = allowedRoles.includes("customer") && hasCustomerCapability && customerLocked;
  const canAccessLockedAffiliate = allowedRoles.includes("affiliate") && hasAffiliateCapability && affiliateLocked;

  if (currentUser?.status === "LOCKED") {
    return React.createElement(Navigate, {
      to: redirectTo,
      replace: true,
      state: {
        reason: "locked",
      },
    });
  }

  if (!hasRequiredRole(roles, allowedRoles) && !canAccessLockedCustomer && !canAccessLockedAffiliate) {
    return React.createElement(Navigate, {
      to: redirectTo,
      replace: true,
      state: {
        reason: "forbidden",
      },
    });
  }

  if (allowedRoles.includes("affiliate") && !canAccessAffiliate && !canAccessLockedAffiliate) {
    return React.createElement(Navigate, { to: "/dashboard/customer/affiliate", replace: true });
  }

  return children || React.createElement(Outlet);
}

export { AuthGuard, GuestGuard, RoleGuard, hasRequiredRole, isAuthenticated };
