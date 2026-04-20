import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createWithdrawalRequest,
  getWithdrawalRequestContext,
  getWithdrawalRequests,
} from "../../../api/walletApi";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import StatusBadge from "../../../components/common/StatusBadge";
import WithdrawalForm from "../../../components/wallet/WithdrawalForm";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapWithdrawalContextDto, mapWithdrawalDto } from "../../../lib/apiMappers";

const WITHDRAWALS_PER_PAGE = 8;

function getWithdrawalSortPriority(withdrawal) {
  if (withdrawal.status === "PENDING" || withdrawal.status === "PROCESSING") {
    return 0;
  }

  if (withdrawal.status === "APPROVED") {
    return 1;
  }

  return 2;
}

function getWithdrawalTimestamp(withdrawal) {
  return new Date(withdrawal.requested_at || withdrawal.raw?.requestedAt || 0).getTime();
}

function SellerWithdrawalsPage() {
  const toast = useToast();
  const [withdrawals, setWithdrawals] = useState([]);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function loadWithdrawals() {
    try {
      setLoading(true);
      setError("");

      const [contextResponse, withdrawalsResponse] = await Promise.all([
        getWithdrawalRequestContext(),
        getWithdrawalRequests(),
      ]);

      setContext(mapWithdrawalContextDto(contextResponse || {}));
      setWithdrawals((withdrawalsResponse || []).map(mapWithdrawalDto));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được lịch sử rút tiền của người bán.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(values) {
    try {
      setSubmitting(true);
      await createWithdrawalRequest({ amount: Number(values.amount) });
      toast.success("Đã gửi yêu cầu rút tiền.");
      await loadWithdrawals();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không gửi được yêu cầu rút tiền.");
    } finally {
      setSubmitting(false);
    }
  }

  const disabledReason = buildDisabledReason(context);

  const sortedWithdrawals = useMemo(() => {
    return [...withdrawals].sort((left, right) => {
      const priorityDiff = getWithdrawalSortPriority(left) - getWithdrawalSortPriority(right);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return getWithdrawalTimestamp(right) - getWithdrawalTimestamp(left);
    });
  }, [withdrawals]);

  const totalPages = Math.max(1, Math.ceil(sortedWithdrawals.length / WITHDRAWALS_PER_PAGE));

  const paginatedWithdrawals = useMemo(() => {
    const startIndex = (page - 1) * WITHDRAWALS_PER_PAGE;
    return sortedWithdrawals.slice(startIndex, startIndex + WITHDRAWALS_PER_PAGE);
  }, [page, sortedWithdrawals]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(sortedWithdrawals.length / WITHDRAWALS_PER_PAGE))));
  }, [sortedWithdrawals]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Ví và rút tiền"

        action={
          <Link
            to="/dashboard/seller/shop"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            Quản lý shop
          </Link>
        }
      />

      {loading ? (
        <EmptyState
          title="Đang tải lịch sử rút tiền"
          description="Hệ thống đang đồng bộ dữ liệu ví và rút tiền của người bán."
        />
      ) : null}

      {!loading && error ? <EmptyState title="Không tải được dữ liệu rút tiền" description={error} /> : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <WithdrawalForm
              onSubmit={handleSubmit}
              loading={submitting}
              availableBalance={context?.available_balance || 0}
              minAmount={context?.min_amount || 0}
              maxAmount={context?.max_amount || 0}
              maxRequestableAmount={context?.max_requestable_amount || 0}
              paymentAccount={context?.payment_account || null}
              disabledReason={disabledReason}
              title="Yêu cầu rút tiền"
              description="Yêu cầu rút tiền sẽ dùng tài khoản thanh toán mặc định đang hoạt động của người bán."
              paymentAccountLink="/dashboard/seller/shop"
              paymentAccountLinkLabel="Cập nhật tài khoản nhận tiền"
            />
            <div className="space-y-4">
              <SummaryCard
                label="Số dư ví hiện tại"
                value={<MoneyText value={context?.available_balance || 0} className="text-slate-900" />}
                description="Số dư hiện có trong ví sẽ bị giữ lại ngay  yêu cầu rút tiền được duyệt."
              />
              <SummaryCard
                label="Khoảng rút cho phép"
                value={`${formatMoney(context?.min_amount)} - ${formatMoney(context?.max_amount)}`}
                description="Mức rút tối thiểu và tối đa đang áp dụng cho toàn hệ thống."
              />
              <SummaryCard
                label="Số tiền có thể rút ngay"
                value={formatMoney(context?.max_requestable_amount)}
                description="Giá trị này bằng mức nhỏ hơn giữa số dư hiện có và trần rút tiền cho phép."
              />
            </div>
          </div>

          <DataTable
            columns={[
              { key: "id", title: "Yêu cầu" },
              { key: "amount", title: "Số tiền", render: (row) => <MoneyText value={row.amount} /> },
              {
                key: "payment_account",
                title: "Tài khoản nhận",
                render: (row) =>
                  row.raw?.sellerPaymentAccount?.accountNumber || row.raw?.sellerPaymentAccount?.bankName || "--",
              },
              { key: "requested_at", title: "Ngày gửi", render: (row) => formatDateTime(row.requested_at) },
              { key: "status", title: "Trạng thái", render: (row) => <StatusBadge status={row.status} /> },
            ]}
            rows={paginatedWithdrawals}
            emptyTitle="Chưa có yêu cầu rút tiền"
            emptyDescription="Gửi yêu cầu mới để hệ thống bắt đầu xử lý chi trả cho người bán."
          />

          {sortedWithdrawals.length > WITHDRAWALS_PER_PAGE ? (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function buildDisabledReason(context) {
  if (!context) {
    return "Đang tải dữ liệu rút tiền.";
  }

  if (context.can_request) {
    return "";
  }

  return context.missing_requirements?.[0] || "Tài khoản hiện chưa đủ điều kiện rút tiền.";
}

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-sky-700">{label}</p>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function formatMoney(value = 0) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default SellerWithdrawalsPage;
