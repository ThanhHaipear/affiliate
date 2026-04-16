import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAdminFinancialStats, getAdminOrders, reviewRefundRequest } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminOrderDto } from "../../lib/adminMappers";
import { formatCompactCurrency, formatCurrency, formatDateTime } from "../../lib/format";

function AdminOrdersPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sellerConfirmed, setSellerConfirmed] = useState("ALL");
  const [financialStats, setFinancialStats] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const spotlightOrderId = searchParams.get("orderId") || "";

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    loadFinancialStats();
  }, [status, sellerConfirmed]);

  useEffect(() => {
    if (!spotlightOrderId) {
      return;
    }

    setSearch(spotlightOrderId);
  }, [spotlightOrderId]);

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminOrders();
      setOrders((response || []).map(mapAdminOrderDto));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được dữ liệu đơn hàng admin.");
    } finally {
      setLoading(false);
    }
  }

  async function loadFinancialStats() {
    try {
      const response = await getAdminFinancialStats({
        ...(status !== "ALL" ? { status } : {}),
        ...(sellerConfirmed !== "ALL"
          ? { sellerConfirmed: sellerConfirmed === "CONFIRMED" ? "true" : "false" }
          : {}),
      });
      setFinancialStats(response || null);
    } catch (loadError) {
      setFinancialStats(null);
      setError(loadError.response?.data?.message || "Không tải được thống kê tài chính admin.");
    }
  }

  async function handleReviewRefund(statusValue) {
    if (!reviewTarget?.latestRefundId) {
      return;
    }

    try {
      setSubmitting(true);
      await reviewRefundRequest(reviewTarget.latestRefundId, {
        status: statusValue,
        ...(statusValue === "REJECTED" ? { rejectReason: reviewTarget.latestRefundReason || "Rejected by admin" } : {}),
      });
      toast.success(statusValue === "APPROVED" ? "Đã duyệt yêu cầu hoàn tiền." : "Đã từ chối yêu cầu hoàn tiền.");
      setReviewTarget(null);
      await loadOrders();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không review được yêu cầu hoàn tiền.");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchSearch =
        !search ||
        [order.code, order.buyer, order.seller, order.id]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchStatus = status === "ALL" || order.orderStatus === status;
      const matchSellerConfirmed =
        sellerConfirmed === "ALL" ||
        String(order.sellerConfirmedReceivedMoney) === (sellerConfirmed === "CONFIRMED" ? "true" : "false");
      return matchSearch && matchStatus && matchSellerConfirmed;
    });
  }, [orders, search, sellerConfirmed, status]);

  const summary = useMemo(() => {
    return {
      total: filtered.length,
      confirmed: filtered.filter((order) => order.sellerConfirmedReceivedMoney).length,
      grossRevenue: Number(financialStats?.amounts?.grossRevenue || 0),
      pendingCommission: Number(financialStats?.amounts?.pendingCommission || 0),
      settledCommission: Number(financialStats?.amounts?.settledCommission || 0),
      pendingPlatformFee: Number(financialStats?.amounts?.pendingPlatformFee || 0),
      settledPlatformFee: Number(financialStats?.amounts?.settledPlatformFee || 0),
    };
  }, [filtered, financialStats]);

  const spotlightOrder = useMemo(() => {
    if (!spotlightOrderId) {
      return null;
    }

    return orders.find((order) => String(order.id) === String(spotlightOrderId)) || null;
  }, [orders, spotlightOrderId]);

  if (loading) {
    return <LoadingSpinner label="Đang tải đơn hàng admin..." />;
  }

  if (error) {
    return <EmptyState title="Không tải được đơn hàng admin" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title="Giám sát doanh thu và đơn hàng"
        description="Admin theo dõi đơn hàng, thanh toán, settlement và các yêu cầu hủy/hoàn tiền cho đơn VNPAY."
      />

      {spotlightOrderId ? (
        <div className="rounded-[2rem] border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-sky-700">Liên kết sâu</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            {spotlightOrder ? `Đang nhấn mạnh đơn ${spotlightOrder.code}` : `Không tìm thấy đơn #${spotlightOrderId}`}
          </h3>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard label="Tổng đơn" value={summary.total.toLocaleString("vi-VN")} meta="Theo bộ lọc hiện tại" tone="cyan" />
        <AdminStatCard label="Tổng doanh thu" value={formatCompactCurrency(summary.grossRevenue)} tooltip={formatCurrency(summary.grossRevenue)} meta="Theo bộ lọc backend" tone="emerald" />
        <AdminStatCard label="Hoa hồng tạm tính" value={formatCompactCurrency(summary.pendingCommission)} tooltip={formatCurrency(summary.pendingCommission)} meta="Chưa vào ví thật" tone="amber" />
        <AdminStatCard label="Hoa hồng đã ghi nhận" value={formatCompactCurrency(summary.settledCommission)} tooltip={formatCurrency(summary.settledCommission)} meta="Đã vào ví sau settlement" tone="amber" />
        <AdminStatCard label="Phí nền tảng tạm tính" value={formatCompactCurrency(summary.pendingPlatformFee)} tooltip={formatCurrency(summary.pendingPlatformFee)} meta="Chưa vào ví nền tảng" tone="rose" />
        <AdminStatCard label="Seller da xac nhan" value={summary.confirmed.toLocaleString("vi-VN")} meta="Dieu kien ghi nhan hoa hong" tone="rose" />
      </div>

      <div className="grid gap-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
        <Input label="Tìm kiếm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã đơn, khách mua, shop..." />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Trạng thái đơn</span>
          <select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Tất cả</option>
            <option value="CREATED">CREATED</option>
            <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
            <option value="PAID">PAID</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Xác nhận settlement của seller</span>
          <select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" value={sellerConfirmed} onChange={(event) => setSellerConfirmed(event.target.value)}>
            <option value="ALL">Tất cả</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="PENDING">Chưa xác nhận</option>
          </select>
        </label>
      </div>

      <DataTable
        columns={[
          {
            key: "code",
            title: "Don hang",
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900">{row.code}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(row.createdAt)}</p>
              </div>
            ),
          },
          {
            key: "buyer",
            title: "Khách mua / Shop",
            render: (row) => (
              <div>
                <p>{row.buyer}</p>
                <p className="mt-1 text-xs text-slate-500">{row.seller}</p>
              </div>
            ),
          },
          {
            key: "affiliateLabel",
            title: "Affiliate",
            render: (row) => (
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.hasAffiliateAttribution ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {row.affiliateLabel}
              </span>
            ),
          },
          { key: "totalAmount", title: "Tổng tiền", render: (row) => formatCurrency(row.totalAmount) },
          { key: "paymentStatus", title: "Thanh toán", render: (row) => <StatusBadge status={row.paymentStatus} /> },
          { key: "orderStatus", title: "Đơn hàng", render: (row) => <StatusBadge status={row.orderStatus} /> },
          {
            key: "refund",
            title: "Yêu cầu hoàn tiền",
            render: (row) =>
              row.latestRefundStatus ? <StatusBadge status={row.latestRefundStatus} /> : <span className="text-sm text-slate-500">--</span>,
          },
          {
            key: "actions",
            title: "Tác vụ",
            render: (row) =>
              row.latestRefundStatus === "PENDING" ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setReviewTarget(row)}>
                    Duyệt refund
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-slate-500">--</span>
              ),
          },
        ]}
        rows={filtered}
        rowClassName={(row) => (String(row.id) === String(spotlightOrderId) ? "bg-sky-50" : "")}
        emptyTitle="Không có đơn hàng phù hợp"
        emptyDescription="Thử đổi bộ lọc theo trạng thái hoặc tìm theo mã đơn."
      />

      <ConfirmModal
        open={Boolean(reviewTarget)}
        title="Duyệt yêu cầu hoàn tiền"
        description={`Đơn ${reviewTarget?.code} đang có yêu cầu refund pending. Chọn duyệt để hoàn tiền, hoặc đóng modal và từ chối.`}
        confirmLabel="Duyệt"
        loading={submitting}
        onClose={() => setReviewTarget(null)}
        onConfirm={() => handleReviewRefund("APPROVED")}
      >
        <div className="mt-4 flex justify-end">
          <Button variant="danger" loading={submitting} onClick={() => handleReviewRefund("REJECTED")}>
            Từ chối
          </Button>
        </div>
      </ConfirmModal>
    </div>
  );
}

export default AdminOrdersPage;
