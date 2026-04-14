import { useEffect, useMemo, useState } from "react";
import { getSellerOrders, getSellerStats } from "../../../api/sellerApi";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatCard from "../../../components/common/StatCard";
import { formatDateTime } from "../../../lib/format";

function isOrderActive(order = {}) {
  return !["CANCELLED", "REFUNDED"].includes(order.status);
}

function isOrderSettled(order = {}) {
  return isOrderActive(order) && Boolean(order.sellerConfirmedReceivedMoney);
}

function sumPlatformFee(items = []) {
  return items.reduce((sum, item) => sum + Number(item.platformFeeAmount || 0), 0);
}

function sumAffiliateCommission(items = []) {
  return items.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0);
}

function sumSellerNet(items = []) {
  return items.reduce((sum, item) => sum + Number(item.sellerNetAmount || 0), 0);
}

function SellerRevenuePage() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");
        const [ordersResponse, statsResponse] = await Promise.all([
          getSellerOrders(),
          getSellerStats(),
        ]);
        if (active) {
          setOrders(ordersResponse || []);
          setStats(statsResponse || null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được báo cáo doanh thu.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(
    () => ({
      grossRevenue: Number(stats?.amounts?.grossRevenue || 0),
      affiliateRevenue: Number(stats?.amounts?.affiliateRevenue || 0),
      directRevenue: Number(stats?.amounts?.directRevenue || 0),
      pendingPlatformFee: Number(stats?.amounts?.pendingPlatformFee || 0),
      settledPlatformFee: Number(stats?.amounts?.settledPlatformFee || 0),
      pendingCommission: Number(stats?.amounts?.pendingCommission || 0),
      settledCommission: Number(stats?.amounts?.settledCommission || 0),
      pendingSellerNet: Number(stats?.amounts?.pendingSellerNet || 0),
      settledSellerNet: Number(stats?.amounts?.settledSellerNet || 0),
    }),
    [stats],
  );

  const topProducts = useMemo(() => {
    const grouped = new Map();

    orders.forEach((order) => {
      if (!isOrderActive(order)) {
        return;
      }

      (order.items || []).forEach((item) => {
        const key = item.productId || item.productNameSnapshot;
        const current = grouped.get(key) || {
          product: item.productNameSnapshot || `Product #${item.productId}`,
          revenue: 0,
          affiliateOrders: 0,
        };

        current.revenue += Number(item.totalPrice || item.subtotalAmount || 0);
        if (item.affiliateId) {
          current.affiliateOrders += 1;
        }

        grouped.set(key, current);
      });
    });

    return [...grouped.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Doanh thu và báo cáo"
        description="Báo cáo đã được tách rõ doanh thu affiliate, doanh thu trực tiếp, phí nền tảng, hoa hồng và phần seller thực nhận."
      />
      {loading ? <EmptyState title="Đang tải báo cáo" description="Hệ thống đang tổng hợp doanh thu seller." /> : null}
      {!loading && error ? <EmptyState title="Không tải được báo cáo" description={error} /> : null}
      {!loading && !error ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Tổng doanh thu" value={<MoneyText value={summary.grossRevenue} />} tone="emerald" strong />
            <StatCard label="Doanh thu affiliate" value={<MoneyText value={summary.affiliateRevenue} />} tone="amber" strong />
            <StatCard label="Doanh thu trực tiếp" value={<MoneyText value={summary.directRevenue} />} tone="cyan" strong />
            <StatCard label="Phí nền tảng tạm tính" value={<MoneyText value={summary.pendingPlatformFee} />} tone="rose" strong />
            <StatCard label="Phí nền tảng đã ghi nhận" value={<MoneyText value={summary.settledPlatformFee} />} tone="rose" strong />
            <StatCard label="Hoa hồng tạm tính" value={<MoneyText value={summary.pendingCommission} />} tone="amber" strong />
            <StatCard label="Hoa hồng đã ghi nhận" value={<MoneyText value={summary.settledCommission} />} tone="amber" strong />
            <StatCard label="Seller net tạm tính" value={<MoneyText value={summary.pendingSellerNet} />} tone="cyan" strong />
            <StatCard
              label="Doanh thu thực nhận"
              value={<MoneyText value={summary.settledSellerNet} />}
              hint="Chỉ tính các đơn hợp lệ đã xác nhận nhận tiền"
              tone="emerald"
              strong
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Công thức thực nhận</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Doanh thu thực nhận = giá trị đơn hợp lệ đã xác nhận tiền - phí nền tảng - hoa hồng affiliate.
              </p>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Top sản phẩm</h3>
              <div className="mt-4 space-y-3">
                {topProducts.map((item) => (
                  <div key={item.product} className="rounded-[1.5rem] bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{item.product}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {Number(item.affiliateOrders || 0).toLocaleString("vi-VN")} đơn affiliate | <MoneyText value={item.revenue} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DataTable
            columns={[
              { key: "orderCode", title: "Đơn hàng" },
              { key: "createdAt", title: "Ngày tạo", render: (row) => formatDateTime(row.createdAt) },
              { key: "totalAmount", title: "Tổng tiền", render: (row) => <MoneyText value={isOrderActive(row) ? row.totalAmount : 0} /> },
              { key: "platformFeeAmount", title: "Phí nền tảng", render: (row) => <MoneyText value={isOrderSettled(row) ? sumPlatformFee(row.items || []) : 0} /> },
              { key: "affiliateCommissionAmount", title: "Hoa hồng affiliate", render: (row) => <MoneyText value={isOrderSettled(row) ? sumAffiliateCommission(row.items || []) : 0} /> },
              { key: "netAmount", title: "Seller net", render: (row) => <MoneyText value={isOrderSettled(row) ? sumSellerNet(row.items || []) : 0} /> },
            ]}
            rows={orders}
            keyField="id"
          />
        </>
      ) : null}
    </div>
  );
}

export default SellerRevenuePage;
