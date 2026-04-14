import { useEffect, useMemo, useState } from "react";
import { getAffiliateCommissions } from "../../../api/affiliateApi";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { formatCurrency } from "../../../lib/format";
import { mapCommissionDto } from "../../../lib/apiMappers";

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

  const pendingAmount = rows.reduce((sum, item) => sum + Number(item.pending_amount || 0), 0);
  const approvedAmount = rows.reduce((sum, item) => sum + Number(item.actual_amount || 0), 0);
  const pendingCount = rows.filter((item) => Number(item.pending_amount || 0) > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate"
        title="Bảng theo dõi hoa hồng"
        description="Theo dõi hoa hồng theo từng đơn và số tiền thực nhận sau khi seller xác nhận đã thu tiền."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Tạm tính" value={formatCurrency(pendingAmount)} tone="amber" hint="Tổng hoa hồng đang chờ mở khóa." />
        <MetricCard label="Đã duyệt" value={formatCurrency(approvedAmount)} tone="emerald" hint="Chỉ tính sau khi seller xác nhận nhận tiền." />
        <MetricCard label="Đơn chưa mở khóa" value={pendingCount} tone="slate" hint="Các đơn này chưa đủ điều kiện ghi nhận thực nhận." />
      </div>
      {loading ? <EmptyState title="Đang tải hoa hồng" description="Hệ thống đang lấy bảng commission từ backend." /> : null}
      {!loading && error ? <EmptyState title="Không tải được hoa hồng" description={error} /> : null}
      {!loading && !error ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/70">
          <DataTable
            className="border-0 shadow-none"
            columns={[
              { key: "order_code", title: "Đơn hàng" },
              { key: "product_name", title: "Sản phẩm" },
              { key: "order_amount", title: "Tổng tiền", render: (row) => <MoneyText value={row.order_amount} /> },
              {
                key: "affiliate_commission_amount",
                title: "Hoa hồng affiliate",
                render: (row) => <MoneyText value={row.affiliate_commission_amount} />,
              },
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
            rows={rows}
          />
        </div>
      ) : null}
    </div>
  );
}

export default AffiliateCommissionsPage;
