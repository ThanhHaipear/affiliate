import { useEffect, useMemo, useState } from "react";
import { getAffiliateCommissions } from "../../../api/affiliateApi";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import StatusBadge from "../../../components/common/StatusBadge";
import { formatCurrency } from "../../../lib/format";
import { mapCommissionDto } from "../../../lib/apiMappers";

const COMMISSIONS_PER_PAGE = 8;

function getConditionText(row) {
  if (row.order_status === "CANCELLED") {
    return "Không đủ điều kiện nhận hoa hồng vì đơn hàng đã bị hủy.";
  }

  if (row.order_status === "REFUNDED") {
    return "Không đủ điều kiện nhận hoa hồng vì đơn hàng đã được hoàn tiền.";
  }

  if (!row.seller_confirmed_received_money) {
    return "Seller chưa xác nhận nhận tiền nên chưa được ghi nhận thực nhận.";
  }

  return row.reason || "Đủ điều kiện ghi nhận hoa hồng.";
}

function getCommissionTime(row) {
  return new Date(
    row?.raw?.walletCreditedAt ||
    row?.raw?.fraudCheckedAt ||
    row?.raw?.createdAt ||
    row?.raw?.order?.createdAt ||
    0,
  ).getTime();
}

function MetricCard({ label, value, tone = "sky", hint }) {
  const tones = {
    sky: "border-sky-200 bg-sky-50 text-sky-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
  };

  return (
    <div className={`rounded-[1.75rem] border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold leading-tight">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p> : null}
    </div>
  );
}

function AffiliateCommissionsPage({ commissions: initialCommissions }) {
  const [commissions, setCommissions] = useState(initialCommissions || []);
  const [loading, setLoading] = useState(!initialCommissions);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (initialCommissions) {
      return undefined;
    }

    let active = true;

    async function loadCommissions() {
      try {
        setLoading(true);
        setError("");
        const response = await getAffiliateCommissions();
        if (active) {
          setCommissions((response || []).map(mapCommissionDto));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được hoa hồng.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCommissions();

    return () => {
      active = false;
    };
  }, [initialCommissions]);

  const rows = useMemo(
    () =>
      commissions.map((commission) =>
        "raw" in commission || "pending_amount" in commission ? commission : mapCommissionDto(commission),
      ),
    [commissions],
  );

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => {
      const leftPending = left.status === "PENDING" ? 1 : 0;
      const rightPending = right.status === "PENDING" ? 1 : 0;

      if (leftPending !== rightPending) {
        return rightPending - leftPending;
      }

      return getCommissionTime(right) - getCommissionTime(left);
    });
  }, [rows]);

  useEffect(() => {
    setPage(1);
  }, [commissions.length]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / COMMISSIONS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * COMMISSIONS_PER_PAGE;
    return sortedRows.slice(startIndex, startIndex + COMMISSIONS_PER_PAGE);
  }, [currentPage, sortedRows]);

  const pendingAmount = rows.reduce((sum, item) => sum + Number(item.pending_amount || 0), 0);
  const approvedAmount = rows.reduce((sum, item) => sum + Number(item.actual_amount || 0), 0);
  const pendingCount = rows.filter((item) => Number(item.pending_amount || 0) > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tiếp thị liên kết"
        title="Bảng theo dõi hoa hồng"
        description="Theo dõi các đơn tạo hoa hồng, phần đang tạm giữ và số tiền thực nhận sau khi seller xác nhận đã nhận tiền."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Tạm tính"
          value={formatCurrency(pendingAmount)}
          tone="amber"
          hint="Khoản hoa hồng đang chờ seller xác nhận đã nhận tiền."
        />
        <MetricCard
          label="Đã ghi nhận"
          value={formatCurrency(approvedAmount)}
          tone="emerald"
          hint="Khoản hoa hồng đã đủ điều kiện và được tính vào ví affiliate."
        />
        <MetricCard
          label="Đơn chưa hoàn tất"
          value={pendingCount}
          tone="slate"
          hint="Ưu tiên hiển thị các đơn còn đang chờ xử lý ở đầu danh sách."
        />
      </div>
      {loading ? <EmptyState title="Đang tải hoa hồng" description="Hệ thống đang lấy dữ liệu hoa hồng từ máy chủ." /> : null}
      {!loading && error ? <EmptyState title="Không tải được hoa hồng" description={error} /> : null}
      {!loading && !error ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/70">
          <DataTable
            className="border-0 shadow-none"
            columns={[
              { key: "order_code", title: "Đơn hàng" },
              { key: "product_name", title: "Sản phẩm" },
              { key: "pending_amount", title: "Tạm tính", render: (row) => <MoneyText value={row.pending_amount} /> },
              {
                key: "actual_amount",
                title: "Thực nhận",
                render: (row) =>
                  row.seller_confirmed_received_money ? (
                    <MoneyText value={row.actual_amount} />
                  ) : (
                    <span className="font-medium text-amber-700">Chưa đủ điều kiện</span>
                  ),
              },
              { key: "status", title: "Trạng thái", render: (row) => <StatusBadge status={row.status} /> },
              {
                key: "reason",
                title: "Ghi chú",
                render: (row) => <span className="text-sm leading-7 text-slate-600">{getConditionText(row)}</span>,
              },
            ]}
            rows={paginatedRows}
          />
        </div>
      ) : null}
      {!loading && !error && sortedRows.length > COMMISSIONS_PER_PAGE ? (
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      ) : null}
    </div>
  );
}

export default AffiliateCommissionsPage;
