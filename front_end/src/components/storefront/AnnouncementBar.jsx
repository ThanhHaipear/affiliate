import { Link } from "react-router-dom";

function AnnouncementBar() {
  return (
    <div className="border-b border-sky-200 bg-[linear-gradient(90deg,#eff6ff_0%,#f0fdfa_58%,#f7fee7_100%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 text-sm text-slate-800 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p className="font-semibold">
          Nền tảng tiếp thị liên kết minh bạch: người bán chỉ trả hoa hồng khi đơn hàng thành công và đã xác nhận nhận tiền.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-900">
          <span>Admin duyệt người bán</span>
          <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
          <span>Admin duyệt đối tác tiếp thị</span>
          <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
          <Link to="/products" className="text-emerald-800 underline-offset-4 transition hover:text-emerald-900 hover:underline">
            Khám phá sản phẩm
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AnnouncementBar;
