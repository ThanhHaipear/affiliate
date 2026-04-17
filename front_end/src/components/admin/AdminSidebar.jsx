import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

const navigationGroups = [
  {
    title: "Tổng quan",
    items: [
      { label: "Bảng điều khiển", to: "/admin/dashboard", hint: "Toàn cảnh hệ thống" },
      { label: "Tài khoản", to: "/admin/accounts", hint: "Người dùng và vai trò" },
      { label: "Thông báo", to: "/admin/notifications", hint: "Hộp thư sự kiện admin" },
    ],
  },
  {
    title: "Hàng đợi duyệt",
    items: [
      { label: "Người bán chờ duyệt", to: "/admin/sellers/pending", hint: "Duyệt hồ sơ người bán" },
      { label: "Affiliate chờ duyệt", to: "/admin/affiliates/pending", hint: "Duyệt hồ sơ tiếp thị" },
      { label: "Sản phẩm chờ duyệt", to: "/admin/products/pending", hint: "Duyệt danh mục sản phẩm" },
    ],
  },
  {
    title: "Vận hành",
    items: [
      { label: "Đơn hàng", to: "/admin/orders", hint: "Đơn hàng và yêu cầu hoàn tiền" },
      { label: "Duyệt rút tiền", to: "/admin/withdrawals/pending", hint: "Yêu cầu chi trả đang chờ" },
      { label: "Các đợt chi trả", to: "/admin/commissions", hint: "Chi trả affiliate theo batch" },
      { label: "Phát hiện gian lận", to: "/admin/fraud-detection", hint: "Tín hiệu rủi ro" },
    ],
  },
  {
    title: "Điều khiển",
    items: [
      { label: "Cài đặt", to: "/admin/settings", hint: "Phí, ngưỡng và ảnh chụp tài chính" },
    ],
  },
];

function AdminSidebar() {
  return (
    <aside className="sticky top-0 h-screen overflow-y-auto border-r border-slate-900/80 bg-[#07111f] px-5 py-6">
      <div className="rounded-[2rem] border border-cyan-400/15 bg-cyan-400/10 p-5 shadow-[0_20px_80px_rgba(14,165,233,0.08)]">
        <p className="text-xs uppercase tracking-[0.38em] text-cyan-200/80">Bảng điều hành admin</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Trung tâm kiểm soát</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Duyệt hồ sơ, theo dõi rủi ro và quản lý tài chính nền tảng tại một nơi.
        </p>
      </div>
      <nav className="mt-8 space-y-6">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            <p className="px-1 text-[11px] uppercase tracking-[0.3em] text-slate-500">{group.title}</p>
            <div className="mt-3 space-y-2">
              {group.items.map((item) => (
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
                          Mở
                        </span>
                      </div>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
