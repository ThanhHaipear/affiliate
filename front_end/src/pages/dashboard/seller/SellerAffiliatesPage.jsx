import { useCallback, useEffect, useMemo, useState } from "react";
import { getSellerAffiliates } from "../../../api/sellerApi";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import StatusBadge from "../../../components/common/StatusBadge";
import { formatCurrency, formatCompactCurrency } from "../../../lib/format";

const PAGE_SIZE = 8;

const SORT_OPTIONS = [
  { value: "totalOrders", label: "Số đơn hàng (nhiều nhất)" },
  { value: "totalRevenue", label: "Doanh thu (cao nhất)" },
  { value: "totalCommission", label: "Hoa hồng (cao nhất)" },
  { value: "completedOrders", label: "Đơn hoàn thành (nhiều nhất)" },
  { value: "totalLinks", label: "Số link (nhiều nhất)" },
];

function SellerAffiliatesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState("totalOrders");
  const [sortOrder, setSortOrder] = useState("desc");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await getSellerAffiliates({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        sortBy,
        sortOrder,
      });
      setData(result);
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          "Không tải được danh sách affiliate."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  const handleSortOrderToggle = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Affiliate của shop"
        description={`Hiện có ${total} affiliate đang tiếp thị sản phẩm của shop bạn. Theo dõi hiệu suất bán hàng của từng affiliate.`}
      />

      {/* Filters Bar */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
              Tìm kiếm affiliate
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nhập tên, email hoặc SĐT..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.97]"
              >
                Tìm
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  Xóa
                </button>
              )}
            </div>
          </form>

          {/* Sort */}
          <div className="min-w-[220px]">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
              Sắp xếp theo
            </label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSortOrderToggle}
                title={sortOrder === "desc" ? "Giảm dần" : "Tăng dần"}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.97]"
              >
                {sortOrder === "desc" ? "↓" : "↑"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <EmptyState
          title="Đang tải danh sách affiliate"
          description="Hệ thống đang truy vấn dữ liệu affiliate của shop bạn..."
        />
      ) : error ? (
        <EmptyState title="Không tải được dữ liệu" description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Chưa có affiliate nào"
          description={
            search
              ? `Không tìm thấy affiliate khớp với "${search}".`
              : "Chưa có affiliate nào tạo link tiếp thị cho sản phẩm của shop bạn."
          }
        />
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Tổng affiliate"
              value={total}
              tone="sky"
            />
            <SummaryCard
              label="Tổng đơn qua affiliate"
              value={items.reduce((s, i) => s + i.totalOrders, 0)}
              tone="emerald"
            />
            <SummaryCard
              label="Tổng doanh thu affiliate"
              value={formatCompactCurrency(
                items.reduce((s, i) => s + i.totalRevenue, 0)
              )}
              tone="amber"
            />
            <SummaryCard
              label="Tổng hoa hồng"
              value={formatCompactCurrency(
                items.reduce((s, i) => s + i.totalCommission, 0)
              )}
              tone="rose"
            />
          </div>

          {/* Affiliate cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((affiliate, index) => (
              <AffiliateCard
                key={affiliate.affiliateId}
                affiliate={affiliate}
                rank={(page - 1) * PAGE_SIZE + index + 1}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone = "sky" }) {
  const toneClasses = {
    sky: "from-sky-500 to-blue-600 text-white",
    emerald: "from-emerald-500 to-teal-600 text-white",
    amber: "from-amber-400 to-orange-500 text-white",
    rose: "from-rose-500 to-pink-600 text-white",
  };

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-5 shadow-md ${toneClasses[tone] || toneClasses.sky}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function AffiliateCard({ affiliate, rank }) {
  const initial = (affiliate.fullName || affiliate.email || "A")
    .charAt(0)
    .toUpperCase();

  const rankColors = {
    1: "from-yellow-400 to-amber-500",
    2: "from-slate-300 to-slate-400",
    3: "from-orange-400 to-amber-600",
  };

  return (
    <div className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Avatar / Rank */}
        <div className="relative shrink-0">
          {affiliate.avatarUrl ? (
            <img
              src={affiliate.avatarUrl}
              alt={affiliate.fullName || "Avatar"}
              className="h-14 w-14 rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 text-xl font-bold text-sky-700 shadow-sm">
              {initial}
            </div>
          )}
          {rank <= 3 && (
            <span
              className={`absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow ${rankColors[rank] || ""}`}
            >
              {rank}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {affiliate.fullName || "Chưa có tên"}
            </h3>
            <StatusBadge
              status={affiliate.activityStatus === "LOCKED" ? "LOCKED" : affiliate.kycStatus}
            />
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {affiliate.email || "—"}
            {affiliate.phone ? ` · ${affiliate.phone}` : ""}
          </p>

          {/* Stats grid */}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <StatItem label="Đơn hàng" value={affiliate.totalOrders} />
            <StatItem label="Hoàn thành" value={affiliate.completedOrders} />
            <StatItem
              label="Doanh thu"
              value={formatCompactCurrency(affiliate.totalRevenue)}
            />
            <StatItem
              label="Hoa hồng"
              value={formatCompactCurrency(affiliate.totalCommission)}
            />
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            <span>{affiliate.totalLinks} link tiếp thị</span>
            <span>·</span>
            <span>ID: {affiliate.affiliateId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default SellerAffiliatesPage;
