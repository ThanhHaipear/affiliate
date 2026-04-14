import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createWithdrawalRequest, getWithdrawalRequestContext, getWithdrawalRequests } from "../../../api/walletApi";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import WithdrawalForm from "../../../components/wallet/WithdrawalForm";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapWithdrawalContextDto, mapWithdrawalDto } from "../../../lib/apiMappers";

function AffiliateWithdrawalsPage() {
  const toast = useToast();
  const [withdrawals, setWithdrawals] = useState([]);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setError(loadError.response?.data?.message || "Không tải được lịch sử rút tiền affiliate.");
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate"
        title="Rút tiền affiliate"
        description="Hiển thị số dư ví, tài khoản nhận tiền mặc định, giới hạn min/max và gửi yêu cầu rút tiền trên cùng một màn hình."
        action={(
          <Link
            to="/dashboard/affiliate/profile"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            Hồ sơ affiliate
          </Link>
        )}
      />
      {loading ? <EmptyState title="Đang tải rút tiền" description="Hệ thống đang đồng bộ lịch sử withdrawal." /> : null}
      {!loading && error ? <EmptyState title="Không tải được yêu cầu rút tiền" description={error} /> : null}
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
              paymentAccountLink="/dashboard/affiliate/profile"
              paymentAccountLinkLabel="Cập nhật tài khoản nhận tiền"
            />
            <div className="space-y-4">
              <SummaryCard
                label="Số dư ví hiện tại"
                value={<MoneyText value={context?.available_balance || 0} className="tabular-nums text-slate-900" />}
                description="Số dư có sẵn trong ví affiliate và sẽ bị trừ ngay khi tạo yêu cầu rút."
              />
              <SummaryCard
                label="Khoảng rút cho phép"
                value={`${formatMoney(context?.min_amount)} - ${formatMoney(context?.max_amount)}`}
                description="Mức rút tối thiểu và tối đa được đọc từ cấu hình withdrawal hiện hành."
              />
              <SummaryCard
                label="Số tiền có thể rút ngay"
                value={formatMoney(context?.max_requestable_amount)}
                description="Giá trị này bằng mức nhỏ hơn giữa số dư hiện có và hạn mức trần cho phép."
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
                render: (row) => row.raw?.affiliatePaymentAccount?.accountNumber || row.raw?.affiliatePaymentAccount?.bankName || "--",
              },
              { key: "requested_at", title: "Ngày gửi", render: (row) => formatDateTime(row.requested_at) },
              { key: "status", title: "Trạng thái", render: (row) => <StatusBadge status={row.status} /> },
            ]}
            rows={withdrawals}
            emptyTitle="Chưa có yêu cầu rút tiền"
            emptyDescription="Gửi yêu cầu mới để hệ thống bắt đầu xử lý payout cho affiliate."
          />
        </div>
      ) : null}
    </div>
  );
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

function buildDisabledReason(context) {
  if (!context) {
    return "Đang tải dữ liệu rút tiền.";
  }

  if (context.can_request) {
    return "";
  }

  return context.missing_requirements?.[0] || "Tài khoản hiện chưa đủ điều kiện rút tiền.";
}

export default AffiliateWithdrawalsPage;
