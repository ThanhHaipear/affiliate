import { useEffect, useState } from "react";
import { getAffiliateCommissions, getAffiliateOverview } from "../../../api/affiliateApi";
import { getWalletSummary } from "../../../api/walletApi";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatCard from "../../../components/common/StatCard";
import StatusBadge from "../../../components/common/StatusBadge";
import { formatCurrency } from "../../../lib/format";
import { mapCommissionDto, mapWalletDto } from "../../../lib/apiMappers";

function AffiliateOverviewPage() {
  const skipRemote = import.meta.env.MODE === "test";
  const [overview, setOverview] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(!skipRemote);
  const [error, setError] = useState("");

  useEffect(() => {
    if (skipRemote) {
      return undefined;
    }

    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const [statsResponse, walletResponse, commissionsResponse] = await Promise.all([
          getAffiliateOverview(),
          getWalletSummary(),
          getAffiliateCommissions(),
        ]);

        if (!active) {
          return;
        }

        setOverview(statsResponse || {});
        setWallet(mapWalletDto((walletResponse || [])[0] || {}));
        setCommissions((commissionsResponse || []).map(mapCommissionDto));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được bảng điều khiển affiliate.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [skipRemote]);

  if (loading) {
    return <EmptyState title="Đang tải dashboard affiliate" description="Hệ thống đang tổng hợp dữ liệu từ backend." />;
  }

  if (error) {
    return <EmptyState title="Không tải được dữ liệu affiliate" description={error} />;
  }

  const generatedOrders = commissions.length;
  const availableBalance = wallet?.balance || 0;
  const approvedCount = commissions.filter((item) => item.actual_amount > 0).length;
  const pendingCount = commissions.filter((item) => item.pending_amount > 0).length;
  const topCommissions = [...commissions]
    .sort((a, b) => Math.max(b.pending_amount, b.actual_amount) - Math.max(a.pending_amount, a.actual_amount))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate"
        title="Bảng điều khiển affiliate"
        description="Theo dõi đơn phát sinh, hoa hồng và số dư rút tiền trong cùng một màn hình."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Đơn phát sinh" value={generatedOrders} tone="emerald" strong />
        <StatCard label="Hoa hồng tạm tính" value={formatCurrency(overview?.pendingCommission || 0)} tone="amber" strong />
        <StatCard label="Hoa hồng đã duyệt" value={formatCurrency(overview?.approvedCommission || 0)} tone="rose" strong />
        <StatCard label="Số dư khả dụng" value={formatCurrency(availableBalance)} tone="emerald" strong />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MetricTile label="Link đã tạo" value={overview?.linkCount || 0} hint="Tổng tracking link đang có trên hệ thống." />
        <MetricTile label="Commission đã duyệt" value={approvedCount} hint="Đã được seller xác nhận nhận tiền." />
        <MetricTile label="Commission chờ mở khóa" value={pendingCount} hint="Đang chờ đủ điều kiện ghi nhận thực nhận." />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Top commission</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Các đơn có giá trị hoa hồng cao nhất, đọc trực tiếp từ bảng commission thực tế.
              </p>
            </div>
            <StatusBadge status={pendingCount ? "PENDING" : "APPROVED"} />
          </div>
          <div className="mt-5 space-y-4">
            {topCommissions.length ? (
              topCommissions.map((item) => (
                <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.order_code}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.product_name}</p>
                    </div>
                    <div className="text-right">
                      <MoneyText value={Math.max(item.pending_amount, item.actual_amount)} className="text-lg font-semibold text-slate-900" />
                      <div className="mt-2">
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Chưa có commission" description="Commission sẽ hiển thị tại đây khi đơn hàng affiliate bắt đầu phát sinh." />
            )}
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Gợi ý tối ưu</h3>
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
            <div className="rounded-[1.5rem] bg-slate-50 p-4">Tập trung các sản phẩm có hoa hồng cao và đã được admin duyệt affiliate.</div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4">Theo dõi các đơn chưa được seller xác nhận nhận tiền để biết commission nào chưa mở khóa.</div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4">Số dư khả dụng và yêu cầu rút tiền đang đọc trực tiếp từ ví backend thay vì dữ liệu mô phỏng.</div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4">Nếu tỷ lệ chuyển đổi thấp, ưu tiên tối ưu nguồn traffic và campaign tag trên các link mới tạo.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, hint }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default AffiliateOverviewPage;
