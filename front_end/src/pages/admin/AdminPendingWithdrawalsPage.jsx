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
import { formatDateTime } from "../../lib/format";
import { mapWithdrawalDto } from "../../lib/apiMappers";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const baseColumns = [
  { key: "id", title: "Yeu cau" },
  {
    key: "owner_type",
    title: "Loai vi",
    render: (row) => row.raw?.ownerType || "--",
  },
  { key: "amount", title: "So tien", render: (row) => <MoneyText value={row.amount} /> },
  {
    key: "receiver",
    title: "Tai khoan nhan",
    render: (row) => {
      const paymentAccount = row.raw?.affiliatePaymentAccount || row.raw?.sellerPaymentAccount;
      return paymentAccount?.accountNumber || paymentAccount?.bankName || "--";
    },
  },
  { key: "requested_at", title: "Ngay gui", render: (row) => formatDateTime(row.requested_at) },
  { key: "status", title: "Trang thai", render: (row) => <StatusBadge status={row.status} /> },
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
          setError(loadError.response?.data?.message || "Khong tai duoc du lieu withdrawal admin.");
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
      ? window.prompt("Nhap ly do tu choi yeu cau rut tien", "")
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

      toast.success(status === "APPROVED" ? "Da duyet yeu cau va cap nhat vao danh sach da duyet." : "Da tu choi yeu cau rut tien.");
    } catch (reviewError) {
      toast.error(reviewError.response?.data?.message || "Khong cap nhat duoc yeu cau rut tien.");
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
      render: (row) => row.raw?.note || row.raw?.payoutBatchId ? `Batch #${row.raw?.payoutBatchId || "--"}` : "Da duyet",
    },
  ];

  const pendingColumns = [
    ...baseColumns,
    {
      key: "actions",
      title: "Thao tac",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" loading={actionId === row.id} disabled={Boolean(actionId)} onClick={() => handleReview(row.id, "APPROVED")}>
            Duyet
          </Button>
          <Button size="sm" variant="danger" disabled={Boolean(actionId)} onClick={() => handleReview(row.id, "REJECTED")}>
            Tu choi
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Yeu cau duyet rut tien"
        description="Admin duyet yeu cau withdrawal cua seller va affiliate. Ben duoi hien ca hang doi cho duyet va danh sach da duyet thuc te."
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
        <AdminStatCard label="Pending requests" value={pendingWithdrawals.length.toLocaleString("vi-VN")} meta="Yeu cau dang cho admin review" tone="amber" />
        <AdminStatCard label="Affiliate requests" value={pendingSummary.affiliateCount.toLocaleString("vi-VN")} meta="Rut tien tu vi affiliate" tone="cyan" />
        <AdminStatCard label="Total pending amount" value={formatCurrency(pendingSummary.totalAmount)} meta={`${pendingSummary.sellerCount.toLocaleString("vi-VN")} yeu cau tu seller`} tone="emerald" />
        <AdminStatCard label="Tong tien da duyet thuc te" value={formatCurrency(approvedSummary.approvedAmount)} meta={`${approvedSummary.approvedCount.toLocaleString("vi-VN")} yeu cau da duyet | Affiliate ${approvedSummary.affiliateApprovedCount.toLocaleString("vi-VN")} | Seller ${approvedSummary.sellerApprovedCount.toLocaleString("vi-VN")}`} tone="rose" />
      </div>

      {loading ? <EmptyState title="Dang tai yeu cau rut tien" description="He thong dang lay du lieu withdrawal cua admin tu backend." /> : null}
      {!loading && error ? <EmptyState title="Khong tai duoc yeu cau rut tien" description={error} /> : null}
      {!loading && !error ? (
        <>
          <section className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Pending</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Danh sach cho duyet</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">Admin co the duyet hoac tu choi ngay tren bang nay.</p>
            </div>
            <DataTable
              columns={pendingColumns}
              rows={pendingWithdrawals}
              emptyTitle="Khong co yeu cau dang cho duyet"
              emptyDescription="Hang doi pending hien dang trong, nhung ben duoi van hien cac yeu cau da duyet."
            />
          </section>

          <section className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Approved</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Danh sach da duyet</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">Hien toan bo yeu cau rut tien da duoc admin duyet thuc te, gom ca request dang cho payout va request da payout.</p>
            </div>
            <DataTable
              columns={approvedColumns}
              rows={approvedWithdrawals}
              emptyTitle="Chua co yeu cau da duyet"
              emptyDescription="Khi admin duyet request rut tien, danh sach nay se hien ngay tai day."
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

export default AdminPendingWithdrawalsPage;
