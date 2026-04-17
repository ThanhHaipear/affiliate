import { useEffect, useMemo, useState } from "react";
import { getPayoutBatches } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import { formatCompactCurrency, formatCurrency, formatDateTime, formatStatusLabel } from "../../lib/format";

function renderBatchStatus(status) {
  const normalizedStatus = String(status || "").trim();

  if (normalizedStatus === "COMPLETED") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
        Tiền đã chi trả
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {formatStatusLabel(normalizedStatus)}
    </span>
  );
}

function AdminCommissionsPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBatches() {
      try {
        setLoading(true);
        setError("");
        const response = await getPayoutBatches();
        if (active) {
          setBatches(response || []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được payout batches.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBatches();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    return batches.reduce(
      (result, batch) => {
        result.totalAmount += Number(batch.totalAmount || 0);
        result.totalRequests += Number(batch.totalRequests || 0);
        if (batch.status === "COMPLETED") {
          result.completed += 1;
        }
        return result;
      },
      { totalAmount: 0, totalRequests: 0, completed: 0 },
    );
  }, [batches]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Các đợt chi trả"
        description="Trang này dùng dữ liệu thật từ payout batches để theo dõi các đợt chi trả affiliate theo từng batch."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          label="Đợt chi trả"
          value={batches.length.toLocaleString("vi-VN")}
          meta="Dữ liệu thật từ backend"
          tone="cyan"
        />
        <AdminStatCard
          label="Tổng yêu cầu"
          value={summary.totalRequests.toLocaleString("vi-VN")}
          meta="Tổng số withdrawal trong các batch"
          tone="amber"
        />
        <AdminStatCard
          label="Tổng tiền đã chi"
          value={formatCompactCurrency(summary.totalAmount)}
          tooltip={formatCurrency(summary.totalAmount)}
          meta={`${summary.completed} batch đã chi trả`}
          tone="emerald"
        />
      </div>
      {!loading && error ? <EmptyState title="Không tải được payout batches" description={error} /> : null}
      {!loading && !error ? (
        <DataTable
          columns={[
            { key: "id", title: "Mã batch" },
            { key: "type", title: "Loại" },
            { key: "totalRequests", title: "Số yêu cầu" },
            { key: "totalAmount", title: "Tổng tiền", render: (row) => formatCurrency(row.totalAmount) },
            { key: "status", title: "Trạng thái", render: (row) => renderBatchStatus(row.status) },
            { key: "payoutDate", title: "Ngày chi trả", render: (row) => formatDateTime(row.payoutDate) },
          ]}
          rows={batches}
          emptyTitle="Chưa có payout batch"
          emptyDescription="Hiện tại chưa có batch chi trả nào."
        />
      ) : null}
    </div>
  );
}

export default AdminCommissionsPage;
