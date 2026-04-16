import { Outlet, useLocation } from "react-router-dom";
import AnnouncementBar from "../storefront/AnnouncementBar";
import StorefrontHeader from "../storefront/StorefrontHeader";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useAuthStore } from "../../store/authStore";

function RoleLockNotice({ title, description, reason }) {
  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-rose-200 bg-[linear-gradient(180deg,#fff1f2_0%,#ffffff_100%)] p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-600">Vai trò đang bị khóa</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
      </div>

      <div className="rounded-[1.75rem] border border-rose-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Lý do khóa</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">{reason || "Quản trị viên chưa bổ sung lý do cụ thể."}</p>
      </div>
    </div>
  );
}

function DashboardLayout() {
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.currentUser);
  const profile = currentUser?.profile || {};
  const isCustomerRoute = location.pathname.startsWith("/dashboard/customer");
  const isAffiliateRoute = location.pathname.startsWith("/dashboard/affiliate");
  const isCustomerLocked = isCustomerRoute && profile.customerLocked;
  const isAffiliateLocked = isAffiliateRoute && (profile.affiliateLocked || profile.affiliateActivityStatus === "LOCKED");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_30%,#eef4f9_100%)]">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[22rem] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="relative z-10">
        <AnnouncementBar />
        <StorefrontHeader />
        <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[300px_1fr] lg:px-8">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Sidebar />
          </div>
          <div className="space-y-6">
            <Header />
            <main>
              {isCustomerLocked ? (
                <RoleLockNotice
                  title="Giao diện customer đang bị khóa"
                  description="Bạn vẫn có thể giữ nguyên giao diện hiện tại, nhưng toàn bộ chức năng của vai trò này đang tạm bị khóa. Vui lòng xem lý do bên dưới hoặc chuyển sang giao diện còn hoạt động."
                  reason={profile.customerLockReason}
                />
              ) : isAffiliateLocked ? (
                <RoleLockNotice
                  title="Giao diện affiliate đang bị khóa"
                  description="Bạn vẫn có thể giữ nguyên giao diện hiện tại, nhưng toàn bộ chức năng của vai trò này đang tạm bị khóa. Vui lòng xem lý do bên dưới hoặc chuyển sang giao diện còn hoạt động."
                  reason={profile.affiliateLockReason}
                />
              ) : (
                <Outlet />
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
