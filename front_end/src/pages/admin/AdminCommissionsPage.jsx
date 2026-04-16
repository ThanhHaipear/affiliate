import { useEffect, useMemo, useState } from "react";
import { getPayoutBatches } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { formatCompactCurrency, formatCurrency, formatDateTime } from "../../lib/format";

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
        title="Quản lý hoa hồng"
        description="Backend chưa có admin commissions endpoint riêng, nên trang này đang dùng dữ liệu thật từ payout batches để theo dõi các đợt chi trả."
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
          meta={`${summary.completed} batch da hoan tat`}
          tone="emerald"
        />
      </div>
      {!loading && error ? <EmptyState title="Không tải được payout batches" description={error} /> : null}
      {!loading && !error ? (
        <DataTable
          columns={[
            { key: "id", title: "Mã batch" },
            { key: "type", title: "Loai" },
            { key: "totalRequests", title: "So yeu cau" },
            { key: "totalAmount", title: "Tổng tiền", render: (row) => formatCurrency(row.totalAmount) },
            { key: "status", title: "Trạng thái", render: (row) => <StatusBadge status={row.status} /> },
            { key: "payoutDate", title: "Ngày chi trả", render: (row) => formatDateTime(row.payoutDate) },
          ]}
          rows={batches}
          emptyTitle="Chưa có payout batch"
          emptyDescription="Backend đã nối API thật, nhưng hiện tại chưa có batch chi trả nào."
        />
      ) : null}
    </div>
  );
}

export default AdminCommissionsPage;
