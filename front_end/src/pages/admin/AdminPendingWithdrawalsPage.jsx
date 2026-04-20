import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createPayoutBatch,
  createPayoutBatchVnpayUrl,
  getAdminWithdrawalSummary,
  getAdminWithdrawals,
  reviewWithdrawal,
} from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import MoneyText from "../../components/common/MoneyText";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { formatCompactCurrency, formatCurrency as formatFullCurrency, formatDateTime } from "../../lib/format";
import { mapWithdrawalDto } from "../../lib/apiMappers";

const ROWS_PER_PAGE = 8;

function formatOwnerType(ownerType = "") {
  if (ownerType === "AFFILIATE") {
    return "Ví affiliate";
  }

  if (ownerType === "SELLER") {
    return "Ví seller";
  }

  return ownerType || "--";
}

function buildReceiverLabel(row) {
  const paymentAccount = row.raw?.affiliatePaymentAccount || row.raw?.sellerPaymentAccount;
  if (!paymentAccount) {
    return "--";
  }

  return [
    paymentAccount.bankName,
    paymentAccount.accountNumber,
    paymentAccount.accountName,
  ].filter(Boolean).join(" | ") || "--";
}

function sortPendingWithdrawals(rows = []) {
  return [...rows].sort((left, right) => {
    const leftTime = new Date(left.requested_at || left.raw?.requestedAt || 0).getTime();
    const rightTime = new Date(right.requested_at || right.raw?.requestedAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function sortApprovedWithdrawals(rows = []) {
  return [...rows].sort((left, right) => {
    const leftUnpaidWeight = left.status === "PAID" ? 1 : 0;
    const rightUnpaidWeight = right.status === "PAID" ? 1 : 0;

    if (leftUnpaidWeight !== rightUnpaidWeight) {
      return leftUnpaidWeight - rightUnpaidWeight;
    }

    const leftTime = new Date(
      left.raw?.processedAt ||
      left.raw?.requestedAt ||
      left.requested_at ||
      0,
    ).getTime();
    const rightTime = new Date(
      right.raw?.processedAt ||
      right.raw?.requestedAt ||
      right.requested_at ||
      0,
    ).getTime();

    return rightTime - leftTime;
  });
}

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
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);

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
          setError(loadError.response?.data?.message || "Không tải được dữ liệu duyệt rút tiền.");
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

  const sortedPendingWithdrawals = useMemo(
    () => sortPendingWithdrawals(pendingWithdrawals),
    [pendingWithdrawals],
  );
  const sortedApprovedWithdrawals = useMemo(
    () => sortApprovedWithdrawals(approvedWithdrawals),
    [approvedWithdrawals],
  );

  const pendingTotalPages = Math.max(1, Math.ceil(sortedPendingWithdrawals.length / ROWS_PER_PAGE));
  const approvedTotalPages = Math.max(1, Math.ceil(sortedApprovedWithdrawals.length / ROWS_PER_PAGE));
  const currentPendingPage = Math.min(pendingPage, pendingTotalPages);
  const currentApprovedPage = Math.min(approvedPage, approvedTotalPages);

  const paginatedPendingWithdrawals = useMemo(() => {
    const startIndex = (currentPendingPage - 1) * ROWS_PER_PAGE;
    return sortedPendingWithdrawals.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [currentPendingPage, sortedPendingWithdrawals]);

  const paginatedApprovedWithdrawals = useMemo(() => {
    const startIndex = (currentApprovedPage - 1) * ROWS_PER_PAGE;
    return sortedApprovedWithdrawals.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [currentApprovedPage, sortedApprovedWithdrawals]);

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

      setPendingWithdrawals((current) =>
        current.filter((item) => String(item.id) !== String(withdrawalId)));

      if (status === "APPROVED" && reviewedRow) {
        setApprovedWithdrawals((current) => [mapWithdrawalDto(reviewedWithdrawal), ...current]);
        setApprovedSummary((current) => ({
          approvedAmount: current.approvedAmount + Number(reviewedRow.amount || 0),
          approvedCount: current.approvedCount + 1,
          affiliateApprovedCount:
            current.affiliateApprovedCount + (reviewedRow.raw?.ownerType === "AFFILIATE" ? 1 : 0),
          sellerApprovedCount:
            current.sellerApprovedCount + (reviewedRow.raw?.ownerType === "SELLER" ? 1 : 0),
        }));
      }

      toast.success(
        status === "APPROVED"
          ? "Đã duyệt yêu cầu và chuyển vào danh sách đã duyệt."
          : "Đã từ chối yêu cầu rút tiền.",
      );
    } catch (reviewError) {
      toast.error(reviewError.response?.data?.message || "Không cập nhật được yêu cầu rút tiền.");
    } finally {
      setActionId(null);
    }
  }

  async function handlePayout(row) {
    const paymentAccount = row.raw?.affiliatePaymentAccount || row.raw?.sellerPaymentAccount || {};
    let batchId = row.raw?.payoutBatchId || null;

    try {
      setActionId(row.id);

      if (!batchId) {
        const createdBatch = await createPayoutBatch({
          payoutDate: new Date().toISOString(),
          type: paymentAccount.type || row.raw?.ownerType || "BANK_TRANSFER",
          withdrawalIds: [Number(row.id)],
          bankName: paymentAccount.bankName || undefined,
          branch: paymentAccount.branch || undefined,
          note: `Payout batch cho yêu cầu rút tiền #${row.id} qua VNPAY sandbox`,
        });

        batchId = createdBatch?.id;

        setApprovedWithdrawals((current) =>
          current.map((item) =>
            String(item.id) === String(row.id)
              ? mapWithdrawalDto({
                ...row.raw,
                payoutBatchId: createdBatch?.id,
                status: "PROCESSING",
              })
              : item,
          ),
        );
      }

      const vnpay = await createPayoutBatchVnpayUrl(batchId, {});
      if (!vnpay?.paymentUrl) {
        throw new Error("Không tạo được URL VNPAY cho payout batch.");
      }

      window.location.href = vnpay.paymentUrl;
    } catch (payError) {
      toast.error(
        payError.response?.data?.message ||
        payError.message ||
        "Không khởi tạo được thanh toán payout qua VNPAY.",
      );
    } finally {
      setActionId(null);
    }
  }

  const baseColumns = [
    { key: "id", title: "Yêu cầu" },
    {
      key: "owner_type",
      title: "Loại ví",
      render: (row) => formatOwnerType(row.raw?.ownerType),
    },
    { key: "amount", title: "Số tiền", render: (row) => <MoneyText value={row.amount} /> },
    {
      key: "receiver",
      title: "Tài khoản nhận",
      render: (row) => buildReceiverLabel(row),
    },
    { key: "requested_at", title: "Ngày gửi", render: (row) => formatDateTime(row.requested_at) },
    { key: "status", title: "Trạng thái", render: (row) => <StatusBadge status={row.status} /> },
  ];

  const pendingColumns = [
    ...baseColumns,
    {
      key: "actions",
      title: "Thao tác",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={actionId === row.id}
            disabled={Boolean(actionId)}
            onClick={() => handleReview(row.id, "APPROVED")}
          >
            Duyệt
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={Boolean(actionId)}
            onClick={() => handleReview(row.id, "REJECTED")}
          >
            Từ chối
          </Button>
        </div>
      ),
    },
  ];

  const approvedColumns = [
    ...baseColumns,
    {
      key: "note",
      title: "Ghi chú",
      render: (row) => (row.raw?.payoutBatchId ? `Batch #${row.raw.payoutBatchId}` : row.raw?.note || "Đã duyệt"),
    },
    {
      key: "approved_actions",
      title: "Thanh toán",
      render: (row) => {
        if (row.status === "PAID") {
          return <span className="text-sm font-medium text-emerald-700">Đã thanh toán</span>;
        }

        return (
          <Button
            size="sm"
            variant={row.status === "PROCESSING" ? "secondary" : "primary"}
            loading={actionId === row.id}
            disabled={Boolean(actionId)}
            onClick={() => handlePayout(row)}
          >
            {row.status === "PROCESSING" ? "Thanh toán lại VNPAY" : "Thanh toán VNPAY"}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị chi trả"
        title="Duyệt rút tiền"


      />

      <div className="grid gap-4 md:grid-cols-4">
        <AdminStatCard
          label="Tổng yêu cầu đang chờ duyệt"
          value={pendingWithdrawals.length.toLocaleString("vi-VN")}

          tone="amber"
        />
        <AdminStatCard
          label="Tổng tiền đang chờ duyệt"
          value={formatCompactCurrency(pendingSummary.totalAmount)}
          tooltip={formatFullCurrency(pendingSummary.totalAmount)}

          tone="cyan"
        />
        <AdminStatCard
          label="Yêu cầu của seller"
          value={pendingSummary.sellerCount.toLocaleString("vi-VN")}

          tone="rose"
        />
        <AdminStatCard
          label="Yêu cầu của affiliate"
          value={pendingSummary.affiliateCount.toLocaleString("vi-VN")}

          tone="emerald"
        />
      </div>

      {loading ? (
        <EmptyState
          title="Đang tải yêu cầu rút tiền"
          description="Hệ thống đang lấy dữ liệu duyệt rút tiền từ backend."
        />
      ) : null}

      {!loading && error ? (
        <EmptyState title="Không tải được yêu cầu rút tiền" description={error} />
      ) : null}

      {!loading && !error ? (
        <>
          <section className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Chờ duyệt</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Danh sách chờ duyệt</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Admin có thể duyệt hoặc từ chối ngay trên bảng này. Danh sách được sắp theo thời gian gửi mới nhất trước.
              </p>
            </div>

            <DataTable
              columns={pendingColumns}
              rows={paginatedPendingWithdrawals}
              emptyTitle="Không có yêu cầu đang chờ duyệt"
              emptyDescription="Hàng đợi chờ duyệt hiện đang trống, nhưng bên dưới vẫn hiển thị các yêu cầu đã duyệt."
            />

            {sortedPendingWithdrawals.length > ROWS_PER_PAGE ? (
              <Pagination
                page={currentPendingPage}
                totalPages={pendingTotalPages}
                onPageChange={setPendingPage}
              />
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Đã duyệt</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Danh sách đã duyệt</h2>

            </div>

            <DataTable
              columns={approvedColumns}
              rows={paginatedApprovedWithdrawals}
              emptyTitle="Chưa có yêu cầu đã duyệt"
              emptyDescription="Khi admin duyệt yêu cầu rút tiền, danh sách này sẽ hiển thị ngay tại đây."
            />

            {sortedApprovedWithdrawals.length > ROWS_PER_PAGE ? (
              <Pagination
                page={currentApprovedPage}
                totalPages={approvedTotalPages}
                onPageChange={setApprovedPage}
              />
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default AdminPendingWithdrawalsPage;
