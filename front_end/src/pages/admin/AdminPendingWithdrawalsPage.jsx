import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminWithdrawalSummary, getAdminWithdrawals, reviewWithdrawal } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import MoneyText from "../../components/common/MoneyText";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { formatCompactCurrency, formatCurrency as formatFullCurrency, formatDateTime } from "../../lib/format";
import { mapWithdrawalDto } from "../../lib/apiMappers";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const baseColumns = [
  { key: "id", title: "Yêu cầu" },
  {
    key: "owner_type",
    title: "Loại ví",
    render: (row) => row.raw?.ownerType || "--",
  },
  { key: "amount", title: "Số tiền", render: (row) => <MoneyText value={row.amount} /> },
  {
    key: "receiver",
    title: "Tài khoản nhận",
    render: (row) => {
      const paymentAccount = row.raw?.affiliatePaymentAccount || row.raw?.sellerPaymentAccount;
      return paymentAccount?.accountNumber || paymentAccount?.bankName || "--";
    },
  },
  { key: "requested_at", title: "Ngày gửi", render: (row) => formatDateTime(row.requested_at) },
  { key: "status", title: "Trạng thái", render: (row) => <StatusBadge status={row.status} /> },
];

function AdminPendingWithdrawalsPage() {
  const toast = useToast();
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [approvedWithdrawals, setApprovedWithdrawals] = useState([]);
  const [approvedSummary, setApprovedSummary] = useState({
    approvedAmount: 0,
    approvedCount: 0,
    affiliateApprovedCount: 0,
    sellerApprovedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadWithdrawals() {
      try {
        setLoading(true);
        setError("");
        const [pendingResponse, approvedResponse, summaryResponse] = await Promise.all([
          getAdminWithdrawals({ statuses: ["PENDING"] }),
          getAdminWithdrawals({ statuses: ["APPROVED", "PROCESSING", "PAID"] }),
          getAdminWithdrawalSummary(),
        ]);

        if (active) {
          setPendingWithdrawals((pendingResponse || []).map(mapWithdrawalDto));
          setApprovedWithdrawals((approvedResponse || []).map(mapWithdrawalDto));
          setApprovedSummary({
            approvedAmount: Number(summaryResponse?.approvedAmount || 0),
            approvedCount: Number(summaryResponse?.approvedCount || 0),
            affiliateApprovedCount: Number(summaryResponse?.affiliateApprovedCount || 0),
            sellerApprovedCount: Number(summaryResponse?.sellerApprovedCount || 0),
          });
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được dữ liệu withdrawal admin.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadWithdrawals();

    return () => {
      active = false;
    };
  }, []);

  async function handleReview(withdrawalId, status) {
    const rejectReason = status === "REJECTED"
      ? window.prompt("Nhập lý do từ chối yêu cầu rút tiền", "")
      : "";

    if (status === "REJECTED" && rejectReason === null) {
      return;
    }

    const reviewedRow = pendingWithdrawals.find((item) => String(item.id) === String(withdrawalId));

    try {
      setActionId(withdrawalId);
      const reviewedWithdrawal = await reviewWithdrawal(withdrawalId, {
        status,
        rejectReason: rejectReason || undefined,
      });

      setPendingWithdrawals((current) => current.filter((item) => String(item.id) !== String(withdrawalId)));

      if (status === "APPROVED" && reviewedRow) {
        setApprovedWithdrawals((current) => [mapWithdrawalDto(reviewedWithdrawal), ...current]);
        setApprovedSummary((current) => ({
          approvedAmount: current.approvedAmount + Number(reviewedRow.amount || 0),
          approvedCount: current.approvedCount + 1,
          affiliateApprovedCount: current.affiliateApprovedCount + (reviewedRow.raw?.ownerType === "AFFILIATE" ? 1 : 0),
          sellerApprovedCount: current.sellerApprovedCount + (reviewedRow.raw?.ownerType === "SELLER" ? 1 : 0),
        }));
      }

      toast.success(status === "APPROVED" ? "Đã duyệt yêu cầu và cập nhật vào danh sách đã duyệt." : "Đã từ chối yêu cầu rút tiền.");
    } catch (reviewError) {
      toast.error(reviewError.response?.data?.message || "Không cập nhật được yêu cầu rút tiền.");
    } finally {
      setActionId(null);
    }
  }

  const pendingSummary = useMemo(() => {
    return pendingWithdrawals.reduce(
      (result, item) => {
        result.totalAmount += Number(item.amount || 0);
        if (item.raw?.ownerType === "AFFILIATE") {
          result.affiliateCount += 1;
        }
        if (item.raw?.ownerType === "SELLER") {
          result.sellerCount += 1;
        }
        return result;
      },
      { totalAmount: 0, affiliateCount: 0, sellerCount: 0 },
    );
  }, [pendingWithdrawals]);

  const approvedColumns = [
    ...baseColumns,
    {
      key: "note",
      title: "Ghi chu",
      render: (row) => row.raw?.note || row.raw?.payoutBatchId ? `Batch #${row.raw?.payoutBatchId || "--"}` : "Đã duyệt",
    },
  ];

  const pendingColumns = [
    ...baseColumns,
    {
      key: "actions",
          title: "Thao tác",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" loading={actionId === row.id} disabled={Boolean(actionId)} onClick={() => handleReview(row.id, "APPROVED")}>
            Duyệt
          </Button>
          <Button size="sm" variant="danger" disabled={Boolean(actionId)} onClick={() => handleReview(row.id, "REJECTED")}>
            Từ chối
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Yêu cầu duyệt rút tiền"
        description="Admin duyệt yêu cầu withdrawal của seller và affiliate. Bên dưới hiển thị cả hàng đợi chờ duyệt và danh sách đã duyệt thực tế."
        action={
          <Link
            to="/admin/commissions"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            Xem payout batches
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <AdminStatCard label="Yêu cầu chờ duyệt" value={pendingWithdrawals.length.toLocaleString("vi-VN")} meta="Yêu cầu đang chờ admin review" tone="amber" />
        <AdminStatCard label="Yêu cầu affiliate" value={pendingSummary.affiliateCount.toLocaleString("vi-VN")} meta="Rút tiền từ ví affiliate" tone="cyan" />
        <AdminStatCard label="Tổng tiền chờ duyệt" value={formatCompactCurrency(pendingSummary.totalAmount)} tooltip={formatFullCurrency(pendingSummary.totalAmount)} meta={`${pendingSummary.sellerCount.toLocaleString("vi-VN")} yêu cầu từ seller`} tone="emerald" />
        <AdminStatCard label="Tổng tiền đã duyệt thực tế" value={formatCompactCurrency(approvedSummary.approvedAmount)} tooltip={formatFullCurrency(approvedSummary.approvedAmount)} meta={`${approvedSummary.approvedCount.toLocaleString("vi-VN")} yêu cầu đã duyệt | Affiliate ${approvedSummary.affiliateApprovedCount.toLocaleString("vi-VN")} | Seller ${approvedSummary.sellerApprovedCount.toLocaleString("vi-VN")}`} tone="rose" />
      </div>

      {loading ? <EmptyState title="Đang tải yêu cầu rút tiền" description="Hệ thống đang lấy dữ liệu withdrawal của admin từ backend." /> : null}
      {!loading && error ? <EmptyState title="Không tải được yêu cầu rút tiền" description={error} /> : null}
      {!loading && !error ? (
        <>
          <section className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Chờ duyệt</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Danh sách chờ duyệt</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">Admin có thể duyệt hoặc từ chối ngay trên bảng này.</p>
            </div>
            <DataTable
              columns={pendingColumns}
              rows={pendingWithdrawals}
              emptyTitle="Không có yêu cầu đang chờ duyệt"
              emptyDescription="Hàng đợi pending hiện đang trống, nhưng bên dưới vẫn hiển thị các yêu cầu đã duyệt."
            />
          </section>

          <section className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Đã duyệt</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Danh sách đã duyệt</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">Hiện toàn bộ yêu cầu rút tiền đã được admin duyệt thực tế, gồm cả request đang chờ payout và request đã payout.</p>
            </div>
            <DataTable
              columns={approvedColumns}
              rows={approvedWithdrawals}
              emptyTitle="Chưa có yêu cầu đã duyệt"
              emptyDescription="Khi admin duyệt request rút tiền, danh sách này sẽ hiện ngay tại đây."
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

export default AdminPendingWithdrawalsPage;
