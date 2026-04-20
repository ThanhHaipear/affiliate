import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAdminFinancialStats, getAdminOrders, getAdminSettings, updatePlatformFee, updateWithdrawalConfig } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminOrderDto } from "../../lib/adminMappers";
import { formatCompactCurrency, formatCurrency, formatDateTime } from "../../lib/format";

function getFeePreview(activeFee) {
  if (!activeFee) {
    return "--";
  }

  return `${activeFee.feeValue}%`;
}

function InsightCard({ title, description, rows }) {
  return (
    <div className="space-y-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{row.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{row.value}</p>
            {row.hint ? <p className="mt-2 text-sm leading-6 text-slate-600">{row.hint}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminSettingsPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingFee, setSavingFee] = useState(false);
  const [savingWithdrawal, setSavingWithdrawal] = useState(false);
  const [error, setError] = useState("");
  const [feeValue, setFeeValue] = useState("5");
  const [minAmount, setMinAmount] = useState("100000");
  const [maxAmount, setMaxAmount] = useState("50000000");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      const [settingsResponse, financialStatsResponse, ordersResponse] = await Promise.all([
        getAdminSettings(),
        getAdminFinancialStats(),
        getAdminOrders(),
      ]);
      setSettings(settingsResponse);
      setFinancialStats(financialStatsResponse || null);
      setOrders((ordersResponse || []).map(mapAdminOrderDto));

      const activeFee = settingsResponse?.activePlatformFee || settingsResponse?.latestPlatformFee;
      if (activeFee) {
        setFeeValue(String(activeFee.feeValue || 5));
      }

      const latestWithdrawalConfig = (settingsResponse?.withdrawalConfigs || [])[0];
      if (latestWithdrawalConfig) {
        setMinAmount(String(latestWithdrawalConfig.minAmount || 0));
        setMaxAmount(String(latestWithdrawalConfig.maxAmount || 0));
      }
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được admin settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePlatformFeeSubmit(event) {
    event.preventDefault();

    try {
      setSavingFee(true);
      await updatePlatformFee({ feeValue: Number(feeValue) });
      toast.success("Đã cập nhật platform fee.");
      await loadSettings();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được platform fee.");
    } finally {
      setSavingFee(false);
    }
  }

  async function handleWithdrawalSubmit(event) {
    event.preventDefault();

    try {
      setSavingWithdrawal(true);
      await updateWithdrawalConfig({
        minAmount: Number(minAmount),
        maxAmount: Number(maxAmount),
      });
      toast.success("Đã cập nhật min/max rút tiền toàn hệ thống.");
      await loadSettings();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được withdrawal config.");
    } finally {
      setSavingWithdrawal(false);
    }
  }

  const activeFee = settings?.activePlatformFee || settings?.latestPlatformFee;
  const withdrawalConfigs = settings?.withdrawalConfigs || [];
  const recentWithdrawalConfigs = withdrawalConfigs.slice(0, 4);
  const latestWithdrawalConfig = withdrawalConfigs[0] || null;
  const spotlightOrderId = searchParams.get("orderId") || "";
  const targetTypes = useMemo(
    () => Array.from(new Set(withdrawalConfigs.map((config) => config.targetType))).join(", ") || "--",
    [withdrawalConfigs],
  );
  const amounts = financialStats?.amounts || {};
  const financialSnapshotRows = [
    {
      label: "Tổng doanh thu hợp lệ",
      value: formatCurrency(amounts.grossRevenue || 0),
      hint: "Không tính đơn đã hủy hoặc đã hoàn tiền.",
    },
    {
      label: "Seller đã ghi nhận",
      value: formatCurrency(amounts.settledSellerNet || 0),
      hint: "Tiền đã được ghi nhận vào ví seller.",
    },
    {
      label: "Affiliate đã ghi nhận",
      value: formatCurrency(amounts.settledCommission || 0),
      hint: "Hoa hồng đã được ghi nhận vào ví affiliate.",
    },
    {
      label: "Phí nền tảng đã ghi nhận",
      value: formatCurrency(amounts.settledPlatformFee || 0),
      hint: "Phần phí nền tảng đã được ghi nhận.",
    },
  ];
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
    return {
      commission: items.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0),
      platformFee: items.reduce((sum, item) => sum + Number(item.platformFeeAmount || 0), 0),
      sellerNet: items.reduce((sum, item) => sum + Number(item.sellerNetAmount || 0), 0),
    };
  }, [spotlightOrder]);

  if (loading) {
    return <LoadingSpinner label="Đang tải trung tâm điều khiển..." />;
  }

  if (error) {
    return <EmptyState title="Không tải được cài đặt" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trung tâm điều khiển"
        title="Cài đặt nền tảng và kiểm soát tài chính"

      />

      {spotlightOrderId ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-rose-700">Liên kết sâu</p>
          {spotlightOrder && spotlightBreakdown ? (
            <div className="space-y-4">
              <div>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">Đơn hàng {spotlightOrder.code}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Bản ghi này được mở từ admin notification để đối chiếu dòng fee, commission và seller net của một giao dịch cụ thể.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.5rem] border border-rose-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Phí nền tảng</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(spotlightBreakdown.platformFee)}</p>
                </div>
                <div className="rounded-[1.5rem] border border-rose-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Hoa hồng</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(spotlightBreakdown.commission)}</p>
                </div>
                <div className="rounded-[1.5rem] border border-rose-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Seller net</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(spotlightBreakdown.sellerNet)}</p>
                </div>
                <div className="rounded-[1.5rem] border border-rose-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Trạng thái</p>
                  <div className="mt-2">
                    <StatusBadge status={spotlightOrder.orderStatus} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to={`/admin/orders?orderId=${spotlightOrder.id}`}>
                  <Button variant="secondary">Mở trong Đơn hàng</Button>
                </Link>
                <div className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                  {formatDateTime(spotlightOrder.createdAt)}
                </div>
              </div>
            </div>
          ) : (
            <>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Không tìm thấy đơn #{spotlightOrderId}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Đơn hàng có thể không còn xuất hiện trong danh sách admin orders hiện tại.
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Phí nền tảng hiện hành" value={getFeePreview(activeFee)} meta="Cấu hình đang áp dụng" tone="cyan" />
        <AdminStatCard label="Phí tạm tính" value={formatCompactCurrency(amounts.pendingPlatformFee || 0)} tooltip={formatCurrency(amounts.pendingPlatformFee || 0)} tone="rose" />
        <AdminStatCard label="Phí đã ghi nhận" value={formatCompactCurrency(amounts.settledPlatformFee || 0)} tooltip={formatCurrency(amounts.settledPlatformFee || 0)} tone="emerald" />
        <AdminStatCard label="Cảnh báo đang có" value={String(settings?.openFraudAlerts || 0)} meta="Chờ admin xử lý" tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <InsightCard
          title="Ảnh chụp tài chính"
          description="Tóm tắt nhanh biên lợi của nền tảng và dòng tiền liên quan sau khi đơn đã hoàn tất."
          rows={financialSnapshotRows || [
            {
              label: "Tổng doanh thu hợp lệ",
              value: formatCurrency(amounts.grossRevenue || 0),
              hint: "Không tính đơn đã hủy hoặc đã hoàn tiền.",
            },
            {
              label: "Seller net tạm tính",
              value: formatCurrency(amounts.pendingSellerNet || 0),
              hint: "Sẽ được chốt khi seller xác nhận hoàn tất đơn.",
            },
            {
              label: "Seller net đã ghi nhận",
              value: formatCurrency(amounts.settledSellerNet || 0),
              hint: "Đã được credit vào ví seller.",
            },
          ]}
        />
        <InsightCard
          title="Cấu hình hiện hành"
          description="Đơn mới sẽ lấy fee mới sau thời điểm cập nhật. Đơn cũ giữ snapshot fee theo order item."
          rows={[
            {
              label: "Phạm vi rút tiền",
              value: targetTypes,
              hint: latestWithdrawalConfig ? `Hiệu lực từ ${formatDateTime(latestWithdrawalConfig.effectiveFrom)}` : "Chưa có config rút tiền.",
            },
            {
              label: "Rút tối thiểu hiện tại",
              value: latestWithdrawalConfig ? String(latestWithdrawalConfig.minAmount) : "--",
              hint: "Áp dụng đồng loạt cho ví seller và affiliate.",
            },
            {
              label: "Rút tối đa hiện tại",
              value: latestWithdrawalConfig ? String(latestWithdrawalConfig.maxAmount) : "--",
              hint: "Áp dụng đồng loạt cho ví seller và affiliate.",
            },
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handlePlatformFeeSubmit} className="space-y-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cập nhật platform fee</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Giá trị này sẽ được dùng cho các đơn mới sau thời điểm cập nhật. Đơn đã tạo trước đó vẫn giữ phí cũ.
            </p>
          </div>
          <Input
            label="Giá trị phí (%)"
            type="number"
            min="0"
            max="100"
            step="1"
            value={feeValue}
            onChange={(event) => setFeeValue(event.target.value)}
            hint="Mặc định 5% cho phí nền tảng."
          />
          <Button type="submit" loading={savingFee}>Lưu phí nền tảng</Button>
        </form>

        <form onSubmit={handleWithdrawalSubmit} className="space-y-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cập nhật min/max rút tiền</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Ngưỡng này được áp đồng loạt cho cả ví affiliate và ví seller trên toàn hệ thống.
            </p>
          </div>
          <Input
            label="Mức tối thiểu"
            type="number"
            min="1"
            step="1"
            value={minAmount}
            onChange={(event) => setMinAmount(event.target.value)}
            hint="Số tiền tối thiểu mỗi lần rút trong hệ thống."
          />
          <Input
            label="Mức tối đa"
            type="number"
            min="1"
            step="1"
            value={maxAmount}
            onChange={(event) => setMaxAmount(event.target.value)}
            hint="Số tiền tối đa mỗi lần rút trong hệ thống."
          />
          <Button type="submit" loading={savingWithdrawal}>Lưu cấu hình rút tiền</Button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cấu hình rút tiền gần nhất</h2>

          </div>
          {recentWithdrawalConfigs.length ? (
            <div className="space-y-3">
              {recentWithdrawalConfigs.map((config) => (
                <div key={config.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{config.targetType}</p>
                  <p className="mt-1">Min: {config.minAmount} | Max: {config.maxAmount}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{formatDateTime(config.effectiveFrom)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có withdrawal config" description="Database chưa có bản ghi withdrawal config nào." />
          )}
        </div>

        <div className="space-y-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Vận hành</h2>

          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Phí có hiệu lực từ</p>
            <p className="mt-2 font-semibold text-slate-900">{formatDateTime(activeFee?.effectiveFrom)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsPage;
