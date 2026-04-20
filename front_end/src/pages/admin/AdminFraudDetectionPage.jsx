import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getFraudAlerts } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import { mapFraudAlertDto } from "../../lib/adminMappers";
import { formatDateTime, formatStatusLabel } from "../../lib/format";

const ALERTS_PER_PAGE = 10;

const statusOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Đang mở", value: "OPEN" },
  { label: "Đang xử lý", value: "PROCESSING" },
  { label: "Đã xử lý", value: "RESOLVED" },
];

const severityOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Cao", value: "HIGH" },
  { label: "Trung bình", value: "MEDIUM" },
  { label: "Thấp", value: "LOW" },
];

const targetTypeLabels = {
  AFFILIATE_LINK: "Link affiliate",
};

const alertTypeLabels = {
  HIGH_FREQUENCY_CLICK: "Click tần suất cao",
};

function formatTargetType(targetType = "") {
  return targetTypeLabels[targetType] || formatStatusLabel(targetType);
}

function formatAlertType(alertType = "") {
  return alertTypeLabels[alertType] || formatStatusLabel(alertType);
}

function AdminFraudDetectionPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [status, severity]);

  async function loadAlerts() {
    try {
      setLoading(true);
      setError("");
      const response = await getFraudAlerts();
      setAlerts((response || []).map(mapFraudAlertDto));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được cảnh báo gian lận.");
    } finally {
      setLoading(false);
    }
  }

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchStatus = status === "ALL" || alert.processStatus === status;
      const matchSeverity = severity === "ALL" || alert.severity === severity;
      return matchStatus && matchSeverity;
    });
  }, [alerts, severity, status]);

  const summary = useMemo(() => {
    return filteredAlerts.reduce(
      (result, alert) => {
        result.total += 1;
        if (alert.processStatus === "OPEN") result.open += 1;
        if (alert.severity === "HIGH") result.high += 1;
        if (alert.severity === "MEDIUM") result.medium += 1;
        return result;
      },
      { total: 0, open: 0, high: 0, medium: 0 },
    );
  }, [filteredAlerts]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / ALERTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * ALERTS_PER_PAGE;
    return filteredAlerts.slice(startIndex, startIndex + ALERTS_PER_PAGE);
  }, [currentPage, filteredAlerts]);

  if (loading) {
    return <LoadingSpinner label="Đang tải cảnh báo gian lận..." />;
  }

  if (error) {
    return <EmptyState title="Không tải được cảnh báo gian lận" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phát hiện gian lận"
        title="Phát hiện gian lận và rà soát bất thường"
        description="Khi có cảnh báo bất thường link affiliate, admin có thể mở đúng link đó để khóa ngay."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Tổng cảnh báo" value={summary.total.toLocaleString("vi-VN")} meta="Theo bộ lọc hiện tại" tone="cyan" />
        <AdminStatCard label="Đang mở" value={summary.open.toLocaleString("vi-VN")} meta="Cần admin rà soát" tone="rose" />
        <AdminStatCard label="Mức độ cao" value={summary.high.toLocaleString("vi-VN")} meta="Cần ưu tiên xử lý" tone="amber" />
        <AdminStatCard label="Mức độ trung bình" value={summary.medium.toLocaleString("vi-VN")} meta="Cần tiếp tục theo dõi" tone="emerald" />
      </div>

      <div className="grid gap-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Trạng thái xử lý</span>
          <select
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Mức độ</span>
          <select
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            {severityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <DataTable
        columns={[
          {
            key: "alertType",
            title: "Cảnh báo",
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900">{formatAlertType(row.alertType)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatTargetType(row.targetType)} #{row.targetId}
                </p>
              </div>
            ),
          },
          { key: "severity", title: "Mức độ", render: (row) => <StatusBadge status={row.severity} /> },
          { key: "processStatus", title: "Trạng thái", render: (row) => <StatusBadge status={row.processStatus} /> },
          { key: "description", title: "Mô tả" },
          {
            key: "actions",
            title: "Tác vụ",
            render: (row) =>
              row.targetType === "AFFILIATE_LINK" ? (
                <Link
                  className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
                  to={`/admin/affiliate-links?linkId=${encodeURIComponent(row.targetId)}`}
                >
                  Đến link để khóa
                </Link>
              ) : (
                <span className="text-xs text-slate-400">Không có tác vụ nhanh</span>
              ),
          },
          {
            key: "processedBy",
            title: "Xử lý",
            render: (row) => (
              <div>
                <p>{row.processedBy}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(row.processedAt)}</p>
              </div>
            ),
          },
          { key: "createdAt", title: "Tạo lúc", render: (row) => formatDateTime(row.createdAt) },
        ]}
        rows={paginatedAlerts}
        emptyTitle="Không có cảnh báo gian lận"
        emptyDescription="Hiện tại chưa có cảnh báo gian lận nào theo bộ lọc đã chọn."
      />

      {filteredAlerts.length > ALERTS_PER_PAGE ? (
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      ) : null}
    </div>
  );
}

export default AdminFraudDetectionPage;
