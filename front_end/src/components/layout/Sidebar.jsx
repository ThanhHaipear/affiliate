import RoleSidebar from "./RoleSidebar";

function Sidebar() {
  return (
    <aside className="w-full rounded-[2rem] border border-slate-200/90 bg-white/95 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur lg:w-[300px]">
      <div className="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,#eff6ff_0%,#f0fdf4_100%)] p-5 text-slate-900 shadow-inner">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Điều hướng</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Bảng điều khiển</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Điều hướng theo vai trò để người bán, affiliate, khách hàng và admin thao tác nhanh hơn.
        </p>
      </div>
      <div className="mt-6">
        <RoleSidebar />
      </div>
    </aside>
  );
}

export default Sidebar;
