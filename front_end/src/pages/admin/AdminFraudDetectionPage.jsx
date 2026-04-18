import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getFraudAlerts } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { mapFraudAlertDto } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

function AdminFraudDetectionPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      setLoading(true);
      setError("");
      const response = await getFraudAlerts();
      setAlerts((response || []).map(mapFraudAlertDto));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Khong tai duoc fraud alerts.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return alerts.filter((alert) => {
      const matchStatus = status === "ALL" || alert.processStatus === status;
      const matchSeverity = severity === "ALL" || alert.severity === severity;
      return matchStatus && matchSeverity;
    });
  }, [alerts, severity, status]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (result, alert) => {
        result.total += 1;
        if (alert.processStatus === "OPEN") result.open += 1;
        if (alert.severity === "HIGH") result.high += 1;
        if (alert.severity === "MEDIUM") result.medium += 1;
        return result;
      },
      { total: 0, open: 0, high: 0, medium: 0 },
    );
  }, [filtered]);

  if (loading) {
    return <LoadingSpinner label="Dang tai fraud alerts..." />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc fraud alerts" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fraud detection"
        title="Phat hien gian lan va review bat thuong"
        description="Trang nay doc du lieu that tu bang fraud_alerts. Khi canh bao nham vao affiliate link, admin co the vao thang link do de khoa ngay."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Tong canh bao" value={summary.total.toLocaleString("vi-VN")} meta="Theo bo loc hien tai" tone="cyan" />
        <AdminStatCard label="Dang mo" value={summary.open.toLocaleString("vi-VN")} meta="Can admin review" tone="rose" />
        <AdminStatCard label="Muc do cao" value={summary.high.toLocaleString("vi-VN")} meta="Can uu tien xu ly" tone="amber" />
        <AdminStatCard label="Muc do trung binh" value={summary.medium.toLocaleString("vi-VN")} meta="Can tiep tuc theo doi" tone="emerald" />
      </div>

      <div className="grid gap-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Trang thai xu ly</span>
          <select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Tat ca</option>
            <option value="OPEN">OPEN</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Muc do</span>
          <select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="ALL">Tat ca</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </label>
      </div>

      <DataTable
        columns={[
          {
            key: "alertType",
            title: "Canh bao",
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900">{row.alertType}</p>
                <p className="mt-1 text-xs text-slate-500">{row.targetType} #{row.targetId}</p>
              </div>
            ),
          },
          { key: "severity", title: "Muc do", render: (row) => <StatusBadge status={row.severity} /> },
          { key: "processStatus", title: "Trang thai", render: (row) => <StatusBadge status={row.processStatus} /> },
          { key: "description", title: "Mo ta" },
          {
            key: "actions",
            title: "Tac vu",
            render: (row) =>
              row.targetType === "AFFILIATE_LINK" ? (
                <Link
                  className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
                  to={`/admin/affiliate-links?linkId=${encodeURIComponent(row.targetId)}`}
                >
                  Den link de khoa
                </Link>
              ) : (
                <span className="text-xs text-slate-400">Khong co tac vu nhanh</span>
              ),
          },
          {
            key: "processedBy",
            title: "Xu ly",
            render: (row) => (
              <div>
                <p>{row.processedBy}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(row.processedAt)}</p>
              </div>
            ),
          },
          { key: "createdAt", title: "Tao luc", render: (row) => formatDateTime(row.createdAt) },
        ]}
        rows={filtered}
        emptyTitle="Khong co fraud alert"
        emptyDescription="Hien tai chua co canh bao gian lan nao theo bo loc da chon."
      />
    </div>
  );
}

export default AdminFraudDetectionPage;
