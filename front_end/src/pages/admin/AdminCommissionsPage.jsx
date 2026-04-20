import { useEffect, useMemo, useState } from "react";
import { getPayoutBatches } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import { formatCompactCurrency, formatCurrency, formatDateTime, formatStatusLabel } from "../../lib/format";

const BATCHES_PER_PAGE = 8;

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
  const [page, setPage] = useState(1);

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
          setError(loadError.response?.data?.message || "Không tải được các đợt chi trả.");
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

  const sortedBatches = useMemo(() => {
    return [...batches].sort((left, right) => {
      const leftPendingWeight = left.status === "COMPLETED" ? 1 : 0;
      const rightPendingWeight = right.status === "COMPLETED" ? 1 : 0;

      if (leftPendingWeight !== rightPendingWeight) {
        return leftPendingWeight - rightPendingWeight;
      }

      const leftTime = new Date(left.payoutDate || left.createdAt || 0).getTime();
      const rightTime = new Date(right.payoutDate || right.createdAt || 0).getTime();

      return rightTime - leftTime;
    });
  }, [batches]);

  const totalPages = Math.max(1, Math.ceil(sortedBatches.length / BATCHES_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedBatches = useMemo(() => {
    const startIndex = (currentPage - 1) * BATCHES_PER_PAGE;
    return sortedBatches.slice(startIndex, startIndex + BATCHES_PER_PAGE);
  }, [currentPage, sortedBatches]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị chi trả"
        title="Các đợt chi trả"

      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          label="Đợt chi trả"
          value={batches.length.toLocaleString("vi-VN")}

          tone="cyan"
        />
        <AdminStatCard
          label="Tổng yêu cầu"
          value={summary.totalRequests.toLocaleString("vi-VN")}

          tone="amber"
        />
        <AdminStatCard
          label="Tổng tiền đã chi"
          value={formatCompactCurrency(summary.totalAmount)}
          tooltip={formatCurrency(summary.totalAmount)}

          tone="emerald"
        />
      </div>

      {!loading && error ? <EmptyState title="Không tải được các đợt chi trả" description={error} /> : null}
      {!loading && !error ? (
        <>
          <DataTable
            columns={[
              { key: "id", title: "Mã batch" },
              { key: "type", title: "Loại chi trả" },
              { key: "totalRequests", title: "Số yêu cầu" },
              { key: "totalAmount", title: "Tổng tiền", render: (row) => formatCurrency(row.totalAmount) },
              { key: "status", title: "Trạng thái", render: (row) => renderBatchStatus(row.status) },
              { key: "payoutDate", title: "Ngày chi trả", render: (row) => formatDateTime(row.payoutDate) },
            ]}
            rows={paginatedBatches}
            emptyTitle="Chưa có đợt chi trả"
            emptyDescription="Hiện tại chưa có batch chi trả nào."
          />

          {sortedBatches.length > BATCHES_PER_PAGE ? (
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default AdminCommissionsPage;
