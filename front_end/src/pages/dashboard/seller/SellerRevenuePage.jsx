import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSellerOrders, getSellerStats } from "../../../api/sellerApi";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import StatCard from "../../../components/common/StatCard";
import { formatCompactCurrency, formatCurrency, formatDateTime } from "../../../lib/format";

const ORDERS_PER_PAGE = 8;

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

function CompactRevenueValue({ value }) {
  return <span title={formatCurrency(value)}>{formatCompactCurrency(value)}</span>;
}

function SellerRevenuePage() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

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
          quantity: 0,
          revenue: 0,
          affiliateOrders: 0,
        };

        current.quantity += Number(item.quantity || 0);
        current.revenue += Number(item.totalPrice || item.subtotalAmount || item.lineTotal || 0);
        if (item.affiliateId) {
          current.affiliateOrders += 1;
        }

        grouped.set(key, current);
      });
    });

    return [...grouped.values()]
      .sort((a, b) => {
        if (b.quantity === a.quantity) {
          return b.revenue - a.revenue;
        }

        return b.quantity - a.quantity;
      })
      .slice(0, 2);
  }, [orders]);

  const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));

  const paginatedOrders = useMemo(() => {
    const startIndex = (page - 1) * ORDERS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [orders, page]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE))));
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Doanh thu và báo cáo"

      />
      {loading ? <EmptyState title="Đang tải báo cáo" description="Hệ thống đang tổng hợp doanh thu seller." /> : null}
      {!loading && error ? <EmptyState title="Không tải được báo cáo" description={error} /> : null}
      {!loading && !error ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Tổng doanh thu" value={<CompactRevenueValue value={summary.grossRevenue} />} tone="emerald" strong />
            <StatCard label="Doanh thu affiliate" value={<CompactRevenueValue value={summary.affiliateRevenue} />} tone="amber" strong />
            <StatCard label="Doanh thu trực tiếp" value={<CompactRevenueValue value={summary.directRevenue} />} tone="cyan" strong />
            <StatCard label="Phí nền tảng tạm tính" value={<CompactRevenueValue value={summary.pendingPlatformFee} />} tone="rose" strong />
            <StatCard label="Phí nền tảng đã ghi nhận" value={<CompactRevenueValue value={summary.settledPlatformFee} />} tone="rose" strong />
            <StatCard label="Hoa hồng tạm tính" value={<CompactRevenueValue value={summary.pendingCommission} />} tone="amber" strong />
            <StatCard label="Hoa hồng đã ghi nhận" value={<CompactRevenueValue value={summary.settledCommission} />} tone="amber" strong />
            <StatCard label="Seller net tạm tính" value={<CompactRevenueValue value={summary.pendingSellerNet} />} tone="cyan" strong />
            <StatCard
              label="Doanh thu thực nhận"
              value={<CompactRevenueValue value={summary.settledSellerNet} />}

              tone="emerald"
              strong
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Công thức thực nhận</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Bảng bên dưới tách riêng tổng tiền đơn, phí ship, phí nền tảng, hoa hồng affiliate và phần seller thực nhận
                để seller theo dõi từng khoản rõ ràng hơn.
              </p>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Top sản phẩm</h3>
              <div className="mt-4 space-y-3">
                {topProducts.map((item) => (
                  <div key={item.product} className="rounded-[1.5rem] bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{item.product}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {Number(item.quantity || 0).toLocaleString("vi-VN")} sản phẩm đã bán |{" "}
                      {Number(item.affiliateOrders || 0).toLocaleString("vi-VN")} đơn affiliate | <MoneyText value={item.revenue} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DataTable
            columns={[
              {
                key: "orderCode",
                title: "Đơn hàng",
                render: (row) => (
                  <Link
                    to={`/dashboard/seller/orders/${row.id}`}
                    className="font-medium text-sky-700 transition hover:text-sky-800 hover:underline"
                  >
                    {row.orderCode}
                  </Link>
                ),
              },
              { key: "createdAt", title: "Ngày tạo", render: (row) => formatDateTime(row.createdAt) },
              { key: "totalAmount", title: "Tổng tiền", render: (row) => <MoneyText value={isOrderActive(row) ? row.totalAmount : 0} /> },
              { key: "shippingFee", title: "Phí ship", render: (row) => <MoneyText value={isOrderActive(row) ? row.shippingFee : 0} /> },
              { key: "platformFeeAmount", title: "Phí nền tảng", render: (row) => <MoneyText value={isOrderSettled(row) ? sumPlatformFee(row.items || []) : 0} /> },
              { key: "affiliateCommissionAmount", title: "Hoa hồng affiliate", render: (row) => <MoneyText value={isOrderSettled(row) ? sumAffiliateCommission(row.items || []) : 0} /> },
              { key: "netAmount", title: "Seller net", render: (row) => <MoneyText value={isOrderSettled(row) ? sumSellerNet(row.items || []) : 0} /> },
            ]}
            rows={paginatedOrders}
            keyField="id"
          />
          {orders.length > ORDERS_PER_PAGE ? (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default SellerRevenuePage;
