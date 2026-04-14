import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

const navigation = [
  { label: "Dashboard", to: "/admin/dashboard", hint: "Overview" },
  { label: "Accounts", to: "/admin/accounts", hint: "Users and roles" },
  { label: "Pending sellers", to: "/admin/sellers/pending", hint: "Merchant approvals" },
  { label: "Pending affiliates", to: "/admin/affiliates/pending", hint: "Publisher approvals" },
  { label: "Pending products", to: "/admin/products/pending", hint: "Catalog reviews" },
  { label: "Orders", to: "/admin/orders", hint: "Revenue monitor" },
  { label: "Notifications", to: "/admin/notifications", hint: "Platform finance events" },
  { label: "Platform fees", to: "/admin/platform-fees", hint: "Margin analytics" },
  { label: "Commissions", to: "/admin/commissions", hint: "Affiliate payouts" },
  { label: "Withdrawal approvals", to: "/admin/withdrawals/pending", hint: "Pending payout requests" },
  { label: "Fraud detection", to: "/admin/fraud-detection", hint: "Risk signals" },
  { label: "Settings", to: "/admin/settings", hint: "Platform rules" },
];

function AdminSidebar() {
  return (
    <aside className="sticky top-0 h-screen overflow-y-auto border-r border-slate-900/80 bg-[#07111f] px-5 py-6">
      <div className="rounded-[2rem] border border-cyan-400/15 bg-cyan-400/10 p-5 shadow-[0_20px_80px_rgba(14,165,233,0.08)]">
        <p className="text-xs uppercase tracking-[0.38em] text-cyan-200/80">Admin cockpit</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Affiliate Control</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Review risk, approve supply, and control platform margin from one place.
        </p>
      </div>
      <nav className="mt-8 space-y-2">
        {navigation.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <div
                className={cn(
                  "group block rounded-[1.5rem] border px-4 py-3 transition",
                  isActive
                    ? "border-sky-200 bg-sky-100 text-sky-950 shadow-[0_12px_28px_rgba(125,211,252,0.2)]"
                    : "border-transparent bg-white/[0.03] text-slate-300 hover:border-sky-200/30 hover:bg-sky-100/10",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className={cn("mt-1 text-xs", isActive ? "text-sky-700" : "text-slate-400")}>{item.hint}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.24em]",
                      isActive ? "border-sky-300 text-sky-700" : "border-white/10 text-slate-400 group-hover:text-slate-200",
                    )}
                  >
                    View
                  </span>
                </div>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
