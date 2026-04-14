import { Link, useNavigate } from "react-router-dom";
import Button from "../common/Button";
import { useAuth } from "../../hooks/useAuth";
import { getInitials } from "../../lib/utils";

const roleLabels = {
  customer: "Khách hàng",
  seller: "Người bán",
  affiliate: "Đối tác tiếp thị",
  admin: "Quản trị viên",
};

function Header() {
  const navigate = useNavigate();
  const { currentUser, logout, roles, activeDashboardRole, setActiveDashboardRole } = useAuth();
  const canSwitchCustomerAffiliate = roles.includes("customer") && roles.includes("affiliate");

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  const handleSwitchRole = (role) => {
    setActiveDashboardRole(role);
    navigate(role === "affiliate" ? "/dashboard/affiliate" : "/dashboard/customer/profile");
  };

  return (
    <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-200/90 bg-white/92 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Không gian làm việc</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Bảng điều khiển vận hành</h1>
        <p className="mt-2 text-sm text-slate-500">Quản lý đơn hàng, hoa hồng, ví và hồ sơ theo từng vai trò.</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {canSwitchCustomerAffiliate ? (
          <div className="flex items-center gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-2">
            <Button
              variant={activeDashboardRole === "customer" ? "secondary" : "ghost"}
              className={activeDashboardRole === "customer" ? "border-sky-200 bg-sky-100 text-sky-900 hover:bg-sky-100" : ""}
              size="sm"
              onClick={() => handleSwitchRole("customer")}
            >
              Giao diện Customer
            </Button>
            <Button
              variant={activeDashboardRole === "affiliate" ? "secondary" : "ghost"}
              className={activeDashboardRole === "affiliate" ? "border-sky-200 bg-sky-100 text-sky-900 hover:bg-sky-100" : ""}
              size="sm"
              onClick={() => handleSwitchRole("affiliate")}
            >
              Giao diện Affiliate
            </Button>
          </div>
        ) : null}
        <Link to="/">
          <Button variant="secondary">Trang chủ</Button>
        </Link>
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {getInitials(currentUser?.profile?.fullName || currentUser?.email || "U")}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {currentUser?.profile?.fullName || currentUser?.email || "Khách"}
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {(roles || []).map((role) => roleLabels[role] || role).join(", ") || "Chưa có vai trò"}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          Đăng xuất
        </Button>
      </div>
    </header>
  );
}

export default Header;
