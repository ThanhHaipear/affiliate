import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAdminFinancialStats, getAdminOrders, getAdminSettings } from "../../../api/adminApi";
import AdminStatCard from "../../../components/admin/AdminStatCard";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { mapAdminOrderDto } from "../../../lib/adminMappers";
import { formatCurrency, formatDateTime } from "../../../lib/format";

function getFeePreview(activeFee) {
  if (!activeFee) {
    return "--";
  }

  return `${activeFee.feeValue} ${activeFee.feeType}`;
}

function calcRate(amount, base) {
  const normalizedBase = Number(base || 0);
  if (!normalizedBase) {
    return "0.0%";
  }

  return `${((Number(amount || 0) / normalizedBase) * 100).toFixed(1)}%`;
}

function InfoCard({ title, description, rows }) {
  return (
    <div className="rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{row.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{row.value}</p>
            {row.hint ? <p className="mt-2 text-sm leading-6 text-slate-600">{row.hint}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPlatformFeesPage() {
  const [searchParams] = useSearchParams();
  const [financialStats, setFinancialStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const spotlightOrderId = searchParams.get("orderId") || "";

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const [financialStatsResponse, settingsResponse, ordersResponse] = await Promise.all([
          getAdminFinancialStats(),
          getAdminSettings(),
          getAdminOrders(),
        ]);

        if (!active) {
          return;
        }

        setFinancialStats(financialStatsResponse || null);
        setSettings(settingsResponse || null);
        setOrders((ordersResponse || []).map(mapAdminOrderDto));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Khong tai duoc thong ke phi nen tang.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const amounts = financialStats?.amounts || {};

    return {
      grossRevenue: Number(amounts.grossRevenue || 0),
      pendingPlatformFee: Number(amounts.pendingPlatformFee || 0),
      settledPlatformFee: Number(amounts.settledPlatformFee || 0),
      pendingSellerNet: Number(amounts.pendingSellerNet || 0),
      settledSellerNet: Number(amounts.settledSellerNet || 0),
    };
  }, [financialStats]);

  const spotlightOrder = useMemo(() => {
    if (!spotlightOrderId) {
      return null;
    }

    return orders.find((order) => String(order.id) === String(spotlightOrderId)) || null;
  }, [orders, spotlightOrderId]);

  const spotlightBreakdown = useMemo(() => {
    if (!spotlightOrder?.raw) {
      return null;
    }

    const items = spotlightOrder.raw.items || [];
    const commission = items.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0);
    const platformFee = items.reduce((sum, item) => sum + Number(item.platformFeeAmount || 0), 0);
    const sellerNet = items.reduce((sum, item) => sum + Number(item.sellerNetAmount || 0), 0);

    return {
      commission,
      platformFee,
      sellerNet,
    };
  }, [spotlightOrder]);

  if (loading) {
    return <LoadingSpinner label="Dang tai thong ke phi nen tang..." />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc thong ke phi nen tang" description={error} />;
  }

  const activeFee = settings?.activePlatformFee || settings?.latestPlatformFee || null;
  const feeRows = (settings?.withdrawalConfigs || []).slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Platform fee analytics"
        description="Khu rieng de theo doi phi nen tang tam tinh, da ghi nhan, ti trong tren doanh thu va cau hinh fee hien hanh."
      />

      {spotlightOrderId ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-rose-700">Deep link</p>
          {spotlightOrder && spotlightBreakdown ? (
            <div className="space-y-4">
              <div>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">Don lien quan {spotlightOrder.code}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Ban dang xem nhanh dong phi nen tang cua order duoc mo tu notification admin.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.5rem] border border-rose-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Platform fee</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(spotlightBreakdown.platformFee)}</p>
                </div>
                <div className="rounded-[1.5rem] border border-rose-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Commission</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(spotlightBreakdown.commission)}</p>
                </div>
                <div className="rounded-[1.5rem] border border-rose-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Seller net</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(spotlightBreakdown.sellerNet)}</p>
                </div>
                <div className="rounded-[1.5rem] border border-rose-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Trang thai</p>
                  <div className="mt-2">
                    <StatusBadge status={spotlightOrder.orderStatus} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to={`/admin/orders?orderId=${spotlightOrder.id}`}>
                  <Button variant="secondary">Mo trong Orders</Button>
                </Link>
                <div className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                  {formatDateTime(spotlightOrder.createdAt)}
                </div>
              </div>
            </div>
          ) : (
            <>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Khong tim thay don #{spotlightOrderId}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Order co the khong con xuat hien trong danh sach admin orders hien tai.
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Phi tam tinh" value={formatCurrency(summary.pendingPlatformFee)} meta="Don hop le da tao nhung chua settlement" tone="rose" />
        <AdminStatCard label="Phi da ghi nhan" value={formatCurrency(summary.settledPlatformFee)} meta="Da vao vi nen tang" tone="emerald" />
        <AdminStatCard label="Ty trong tam tinh" value={calcRate(summary.pendingPlatformFee, summary.grossRevenue)} meta="Pending fee / gross revenue" tone="amber" />
        <AdminStatCard label="Ty trong da ghi nhan" value={calcRate(summary.settledPlatformFee, summary.grossRevenue)} meta="Settled fee / gross revenue" tone="cyan" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <InfoCard
          title="Fee snapshot"
          description="Cac chi so nay tach rieng phi nen tang khoi seller net va affiliate commission de admin nhin duoc bien loi cua he thong."
          rows={[
            {
              label: "Tong doanh thu hop le",
              value: formatCurrency(summary.grossRevenue),
              hint: "Chi tinh cac order dang active, khong tinh don cancel hay refunded.",
            },
            {
              label: "Platform fee tam tinh",
              value: formatCurrency(summary.pendingPlatformFee),
              hint: "Se chuyen sang da ghi nhan khi seller xac nhan da nhan tien.",
            },
            {
              label: "Platform fee da ghi nhan",
              value: formatCurrency(summary.settledPlatformFee),
              hint: "Khoan nay da duoc credit vao vi PLATFORM.",
            },
          ]}
        />

        <InfoCard
          title="Config hien hanh"
          description="Phi moi duoc ap cho don moi tai thoi diem checkout. Don cu giu snapshot fee theo order item."
          rows={[
            {
              label: "Fee active",
              value: getFeePreview(activeFee),
              hint: activeFee?.effectiveFrom ? `Hieu luc tu ${formatDateTime(activeFee.effectiveFrom)}` : "Chua co ban ghi active.",
            },
            {
              label: "Seller net tam tinh",
              value: formatCurrency(summary.pendingSellerNet),
              hint: "Tien seller se nhan sau khi hoan tat settlement.",
            },
            {
              label: "Seller net da ghi nhan",
              value: formatCurrency(summary.settledSellerNet),
              hint: "Da credit vao vi seller sau xac nhan.",
            },
          ]}
        />
      </div>

      <div className="rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Withdrawal configs gan nhat</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Phan nay de admin doi chieu nguong rut tien cung luc voi tong phi nen tang va dong tien seller.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {feeRows.length ? (
            feeRows.map((config) => (
              <div key={config.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{config.targetType}</p>
                <p className="mt-2 font-semibold text-slate-900">Min {config.minAmount} | Max {config.maxAmount}</p>
                <p className="mt-2 text-sm text-slate-600">{formatDateTime(config.effectiveFrom)}</p>
              </div>
            ))
          ) : (
            <EmptyState title="Chua co withdrawal config" description="Database chua co ban ghi withdrawal config nao." />
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPlatformFeesPage;
