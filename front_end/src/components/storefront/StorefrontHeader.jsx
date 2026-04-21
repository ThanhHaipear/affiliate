import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Button from "../common/Button";
import Input from "../common/Input";
import { useAuth } from "../../hooks/useAuth";
import { getInitials } from "../../lib/utils";
import { resolveDashboardRole } from "../../store/authStore";

const navItems = [
  { label: "Trang ch\u1ee7", to: "/" },
  { label: "S\u1ea3n ph\u1ea9m", to: "/products" },
  { label: "Gi\u1edbi thi\u1ec7u", to: "/about" },
  { label: "Ch\u00ednh s\u00e1ch", to: "/policies" },
  { label: "FAQ", to: "/faq" },
  { label: "Li\u00ean h\u1ec7", to: "/contact" },
];

function resolveAccountTarget(currentUser = null, roles = [], activeDashboardRole = null) {
  const preferredRole = resolveDashboardRole(currentUser, roles, activeDashboardRole);

  if (preferredRole === "admin") {
    return "/admin/dashboard";
  }

  if (preferredRole === "seller") {
    return "/dashboard/seller";
  }

  if (preferredRole === "affiliate") {
    return "/dashboard/affiliate";
  }

  return "/dashboard/customer/profile";
}

function StorefrontHeader() {
  const navigate = useNavigate();
  const { currentUser, roles, activeDashboardRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  const accountTarget = useMemo(
    () => resolveAccountTarget(currentUser, roles, activeDashboardRole),
    [currentUser, roles, activeDashboardRole],
  );

  function handleSearchSubmit(event) {
    event.preventDefault();
    const normalized = keyword.trim();
    navigate(normalized ? `/products?search=${encodeURIComponent(normalized)}` : "/products");
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/96 shadow-[0_10px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,#0284c7_0%,#0ea5e9_45%,#10b981_100%)] text-lg font-semibold text-white shadow-[0_16px_34px_rgba(14,165,233,0.20)]">
                AP
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-sky-700">Affiliate Commerce</p>
                <h1 className="text-lg font-semibold text-slate-900">{"S\u00e0n giao d\u1ecbch + B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n"}</h1>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-300 bg-white text-lg font-semibold text-slate-800 xl:hidden"
              aria-label={"M\u1edf menu \u0111i\u1ec1u h\u01b0\u1edbng"}
            >
              {mobileOpen ? "\u00d7" : "\u2261"}
            </button>
          </div>
          <form className="min-w-0 flex-1 xl:max-w-xl" onSubmit={handleSearchSubmit}>
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={"T\u00ecm s\u1ea3n ph\u1ea9m, shop, danh m\u1ee5c..."}
              aria-label={"T\u00ecm ki\u1ebfm s\u1ea3n ph\u1ea9m"}
              className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 focus:border-sky-500"
            />
          </form>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 self-end xl:self-auto">
            {currentUser ? (
              <>
                <Link to="/cart">
                  <Button variant="outline" className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50">
                    {"Gi\u1ecf h\u00e0ng"}
                  </Button>
                </Link>
                <Link
                  to={accountTarget}
                  className="flex items-center gap-3 rounded-[1.4rem] border border-slate-300 bg-slate-50 px-3 py-2 shadow-sm transition hover:border-sky-300 hover:bg-white"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {getInitials(currentUser?.profile?.fullName || currentUser?.email || "U")}
                  </span>
                  <span className="hidden text-sm font-medium text-slate-700 sm:block">
                    {currentUser?.profile?.fullName || currentUser?.email || "T\u00e0i kho\u1ea3n"}
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="secondary"
                    className="min-w-[132px] border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                  >
                    {"\u0110\u0103ng nh\u1eadp"}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="min-w-[132px] bg-sky-700 text-white hover:bg-sky-800">{"\u0110\u0103ng k\u00fd"}</Button>
                </Link>
                <Link to="/cart">
                  <Button variant="outline" className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50">
                    {"Gi\u1ecf h\u00e0ng"}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
        <nav className={["flex flex-col gap-3 xl:flex xl:flex-row xl:items-center xl:gap-2", mobileOpen ? "flex" : "hidden xl:flex"].join(" ")}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  isActive
                    ? "border-sky-200 bg-sky-100 text-sky-900 shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default StorefrontHeader;
