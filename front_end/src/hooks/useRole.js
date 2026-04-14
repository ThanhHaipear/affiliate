import { useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function detectRoleFromPath(pathname, roles = []) {
  if ((pathname.startsWith("/admin") || pathname.startsWith("/dashboard/admin")) && roles.includes("admin")) {
    return "admin";
  }

  if ((pathname.startsWith("/dashboard/seller") || pathname.startsWith("/seller")) && roles.includes("seller")) {
    return "seller";
  }

  if ((pathname.startsWith("/dashboard/affiliate") || pathname.startsWith("/affiliate")) && roles.includes("affiliate")) {
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
    roles.includes("customer")
  ) {
    return "customer";
  }

  return null;
}

function useRole() {
  const location = useLocation();
  const roles = useAuthStore((state) => state.roles);
  const activeDashboardRole = useAuthStore((state) => state.activeDashboardRole);

  const hasRole = (role) => roles.includes(role);
  const hasAnyRole = (requiredRoles = []) =>
    requiredRoles.some((role) => roles.includes(role));

  const routeRole = detectRoleFromPath(location.pathname, roles);
  const primaryRole = routeRole || (activeDashboardRole && roles.includes(activeDashboardRole) ? activeDashboardRole : roles[0] || null);

  return {
    roles,
    activeDashboardRole,
    primaryRole,
    hasRole,
    hasAnyRole,
    isAdmin: hasRole("admin"),
    isSeller: hasRole("seller"),
    isAffiliate: hasRole("affiliate"),
    isCustomer: hasRole("customer"),
  };
}

export { useRole };
