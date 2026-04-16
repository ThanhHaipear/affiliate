import { useLocation } from "react-router-dom";
import { getDashboardCapabilities, useAuthStore } from "../store/authStore";

function detectRoleFromPath(pathname, capabilities = {}) {
  if ((pathname.startsWith("/admin") || pathname.startsWith("/dashboard/admin")) && capabilities.admin) {
    return "admin";
  }

  if ((pathname.startsWith("/dashboard/seller") || pathname.startsWith("/seller")) && capabilities.seller) {
    return "seller";
  }

  if ((pathname.startsWith("/dashboard/affiliate") || pathname.startsWith("/affiliate")) && capabilities.affiliate) {
    return "affiliate";
  }

  if (
    (
      pathname.startsWith("/dashboard/customer") ||
      pathname.startsWith("/account") ||
      pathname.startsWith("/customer") ||
      pathname === "/cart" ||
      pathname === "/checkout"
    ) &&
    capabilities.customer
  ) {
    return "customer";
  }

  return null;
}

function useRole() {
  const location = useLocation();
  const roles = useAuthStore((state) => state.roles);
  const currentUser = useAuthStore((state) => state.currentUser);
  const activeDashboardRole = useAuthStore((state) => state.activeDashboardRole);
  const capabilities = getDashboardCapabilities(currentUser, roles);

  const hasRole = (role) => roles.includes(role);
  const hasAnyRole = (requiredRoles = []) =>
    requiredRoles.some((role) => roles.includes(role));

  const routeRole = detectRoleFromPath(location.pathname, capabilities);
  const primaryRole =
    routeRole ||
    (activeDashboardRole && capabilities[activeDashboardRole] ? activeDashboardRole : null) ||
    ["customer", "affiliate", "seller", "admin"].find((role) => capabilities[role]) ||
    null;

  return {
    roles,
    currentUser,
    activeDashboardRole,
    primaryRole,
    capabilities,
    hasRole,
    hasAnyRole,
    isAdmin: hasRole("admin"),
    isSeller: hasRole("seller"),
    isAffiliate: hasRole("affiliate"),
    isCustomer: hasRole("customer"),
  };
}

export { useRole };
