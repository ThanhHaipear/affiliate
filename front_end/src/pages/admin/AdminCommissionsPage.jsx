import { useEffect, useMemo, useState } from "react";
import { getPayoutBatches } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { formatCurrency, formatDateTime } from "../../lib/format";

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
          setError(loadError.response?.data?.message || "Khong tai duoc payout batches.");
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
        title="Commission control"
        description="Backend chua co admin commissions endpoint rieng, nen trang nay dang dung du lieu that tu payout batches de theo doi cac dot chi tra."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          label="Payout batches"
          value={batches.length.toLocaleString("vi-VN")}
          meta="Du lieu that tu backend"
          tone="cyan"
        />
        <AdminStatCard
          label="Total requests"
          value={summary.totalRequests.toLocaleString("vi-VN")}
          meta="Tong so withdrawal trong cac batch"
          tone="amber"
        />
        <AdminStatCard
          label="Total paid amount"
          value={formatCurrency(summary.totalAmount)}
          meta={`${summary.completed} batch da hoan tat`}
          tone="emerald"
        />
      </div>
      {!loading && error ? <EmptyState title="Khong tai duoc payout batches" description={error} /> : null}
      {!loading && !error ? (
        <DataTable
          columns={[
            { key: "id", title: "Batch" },
            { key: "type", title: "Loai" },
            { key: "totalRequests", title: "So yeu cau" },
            { key: "totalAmount", title: "Tong tien", render: (row) => formatCurrency(row.totalAmount) },
            { key: "status", title: "Trang thai", render: (row) => <StatusBadge status={row.status} /> },
            { key: "payoutDate", title: "Ngay chi tra", render: (row) => formatDateTime(row.payoutDate) },
          ]}
          rows={batches}
          emptyTitle="Chua co payout batch"
          emptyDescription="Backend da noi API that, nhung hien tai chua co batch chi tra nao."
        />
      ) : null}
    </div>
  );
}

export default AdminCommissionsPage;
