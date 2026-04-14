import { NavLink } from "react-router-dom";
import { useRole } from "../../hooks/useRole";
import { cn } from "../../lib/utils";

const roleMenus = {
  admin: [
    { label: "\u0054\u1ed5ng quan", to: "/admin/dashboard" },
    { label: "T\u00e0i kho\u1ea3n", to: "/admin/accounts" },
    { label: "Ng\u01b0\u1eddi b\u00e1n ch\u1edd duy\u1ec7t", to: "/admin/sellers/pending" },
    { label: "Affiliate ch\u1edd duy\u1ec7t", to: "/admin/affiliates/pending" },
    { label: "S\u1ea3n ph\u1ea9m ch\u1edd duy\u1ec7t", to: "/admin/products/pending" },
    { label: "\u0110\u01a1n h\u00e0ng", to: "/admin/orders" },
    { label: "Th\u00f4ng b\u00e1o", to: "/admin/notifications" },
    { label: "Ph\u00ed n\u1ec1n t\u1ea3ng", to: "/admin/platform-fees" },
    { label: "Hoa h\u1ed3ng", to: "/admin/commissions" },
    { label: "Ph\u00e1t hi\u1ec7n gian l\u1eadn", to: "/admin/fraud-detection" },
    { label: "C\u00e0i \u0111\u1eb7t", to: "/admin/settings" },
  ],
  seller: [
    { label: "T\u1ed5ng quan", to: "/dashboard/seller" },
    { label: "Qu\u1ea3n l\u00fd shop", to: "/dashboard/seller/shop" },
    { label: "S\u1ea3n ph\u1ea9m", to: "/dashboard/seller/products" },
    { label: "\u0110\u01a1n h\u00e0ng", to: "/dashboard/seller/orders" },
    { label: "Doanh thu", to: "/dashboard/seller/revenue" },
    { label: "V\u00ed seller", to: "/dashboard/seller/wallet" },
    { label: "R\u00fat ti\u1ec1n", to: "/dashboard/seller/withdrawals" },
    { label: "Th\u00f4ng b\u00e1o", to: "/dashboard/seller/notifications" },
  ],
  affiliate: [
    { label: "T\u1ed5ng quan", to: "/dashboard/affiliate" },
    { label: "S\u1ea3n ph\u1ea9m ti\u1ebfp th\u1ecb", to: "/dashboard/affiliate/marketplace" },
    { label: "Li\u00ean k\u1ebft c\u1ee7a t\u00f4i", to: "/dashboard/affiliate/links" },
    { label: "Hoa h\u1ed3ng", to: "/dashboard/affiliate/commissions" },
    { label: "H\u1ed3 s\u01a1 affiliate", to: "/dashboard/affiliate/profile" },
    { label: "V\u00ed affiliate", to: "/dashboard/affiliate/wallet" },
    { label: "R\u00fat ti\u1ec1n", to: "/dashboard/affiliate/withdrawals" },
    { label: "Th\u00f4ng b\u00e1o", to: "/dashboard/affiliate/notifications" },
    { label: "\u0110\u1ed5i m\u1eadt kh\u1ea9u", to: "/dashboard/affiliate/change-password" },
    { label: "Mua h\u00e0ng v\u1edbi customer", to: "/dashboard/customer/profile" },
  ],
  customer: [
    { label: "H\u1ed3 s\u01a1", to: "/dashboard/customer/profile" },
    { label: "K\u00edch ho\u1ea1t affiliate", to: "/dashboard/customer/affiliate" },
    { label: "\u0110\u1ecba ch\u1ec9", to: "/dashboard/customer/address" },
    { label: "Gi\u1ecf h\u00e0ng", to: "/dashboard/customer/cart" },
    { label: "Thanh to\u00e1n", to: "/dashboard/customer/checkout" },
    { label: "\u0110\u01a1n h\u00e0ng c\u1ee7a t\u00f4i", to: "/dashboard/customer/orders" },
    { label: "Th\u00f4ng b\u00e1o", to: "/dashboard/customer/notifications" },
    { label: "Y\u00eau th\u00edch", to: "/dashboard/customer/wishlist" },
    { label: "\u0110\u1ed5i m\u1eadt kh\u1ea9u", to: "/dashboard/customer/change-password" },
    { label: "Khu affiliate", to: "/dashboard/affiliate" },
  ],
};

function RoleSidebar() {
  const { primaryRole, isAffiliate, isCustomer } = useRole();
  let menuItems = roleMenus[primaryRole] || [];

  if (primaryRole === "customer" && !isAffiliate) {
    menuItems = menuItems.filter((item) => item.to !== "/dashboard/affiliate");
  }

  if (primaryRole === "affiliate" && !isCustomer) {
    menuItems = menuItems.filter((item) => item.to !== "/dashboard/customer/profile");
  }

  return (
    <nav className="space-y-2.5">
      {menuItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "block rounded-[1.15rem] border px-4 py-3 text-sm font-medium transition",
              isActive
                ? "border-sky-200 bg-sky-100 text-sky-900 shadow-[0_12px_28px_rgba(125,211,252,0.25)]"
                : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50 hover:text-slate-900",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default RoleSidebar;
