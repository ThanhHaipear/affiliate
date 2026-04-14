import { useEffect, useMemo, useState } from "react";
import { getAdminSettings, updatePlatformFee, updateWithdrawalConfig } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/format";

function AdminSettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingFee, setSavingFee] = useState(false);
  const [savingWithdrawal, setSavingWithdrawal] = useState(false);
  const [error, setError] = useState("");
  const [feeType, setFeeType] = useState("PERCENT");
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
      const response = await getAdminSettings();
      setSettings(response);

      const activeFee = response?.activePlatformFee || response?.latestPlatformFee;
      if (activeFee) {
        setFeeType(activeFee.feeType || "PERCENT");
        setFeeValue(String(activeFee.feeValue || 5));
      }

      const latestWithdrawalConfig = (response?.withdrawalConfigs || [])[0];
      if (latestWithdrawalConfig) {
        setMinAmount(String(latestWithdrawalConfig.minAmount || 0));
        setMaxAmount(String(latestWithdrawalConfig.maxAmount || 0));
      }
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Khong tai duoc admin settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePlatformFeeSubmit(event) {
    event.preventDefault();

    try {
      setSavingFee(true);
      await updatePlatformFee({ feeType, feeValue: Number(feeValue) });
      toast.success("Da cap nhat platform fee.");
      await loadSettings();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc platform fee.");
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
      toast.success("Da cap nhat min/max rut tien toan he thong.");
      await loadSettings();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc withdrawal config.");
    } finally {
      setSavingWithdrawal(false);
    }
  }

  const activeFee = settings?.activePlatformFee || settings?.latestPlatformFee;
  const withdrawalConfigs = settings?.withdrawalConfigs || [];
  const latestWithdrawalConfig = withdrawalConfigs[0] || null;
  const targetTypes = useMemo(
    () => Array.from(new Set(withdrawalConfigs.map((config) => config.targetType))).join(", ") || "--",
    [withdrawalConfigs],
  );

  if (loading) {
    return <LoadingSpinner label="Dang tai admin settings..." />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc settings" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Platform settings"
        description="Admin co the cap nhat phi nen tang va nguong rut tien min/max cho toan bo he thong ngay trong mot man hinh."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Platform fee hien tai" value={activeFee ? `${activeFee.feeValue} ${activeFee.feeType}` : "--"} meta="Config dang active" tone="cyan" />
        <AdminStatCard label="Rut toi thieu hien tai" value={latestWithdrawalConfig ? String(latestWithdrawalConfig.minAmount) : "--"} meta="Ap dung toan he thong" tone="emerald" />
        <AdminStatCard label="Rut toi da hien tai" value={latestWithdrawalConfig ? String(latestWithdrawalConfig.maxAmount) : "--"} meta="Ap dung toan he thong" tone="amber" />
        <AdminStatCard label="Open fraud alerts" value={String(settings?.openFraudAlerts || 0)} meta="Cho admin xu ly" tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handlePlatformFeeSubmit} className="space-y-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cap nhat platform fee</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Gia tri nay se duoc dung cho cac don moi sau thoi diem cap nhat. Don da tao truoc do van giu snapshot phi cu.
            </p>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Fee type</span>
            <select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" value={feeType} onChange={(event) => setFeeType(event.target.value)}>
              <option value="PERCENT">PERCENT</option>
              <option value="FLAT">FLAT</option>
            </select>
          </label>
          <Input
            label="Fee value"
            type="number"
            min="1"
            step="1"
            value={feeValue}
            onChange={(event) => setFeeValue(event.target.value)}
            hint={feeType === "PERCENT" ? "Mac dinh 5 cho 5%" : "Gia tri VND co dinh moi don"}
          />
          <Button type="submit" loading={savingFee}>Luu platform fee</Button>
        </form>

        <form onSubmit={handleWithdrawalSubmit} className="space-y-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cap nhat min/max rut tien</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Nguong nay duoc ap dong loat cho ca vi affiliate va vi seller tren toan he thong.
            </p>
          </div>
          <Input
            label="Min amount"
            type="number"
            min="1"
            step="1"
            value={minAmount}
            onChange={(event) => setMinAmount(event.target.value)}
            hint="So tien toi thieu de duoc tao yeu cau rut."
          />
          <Input
            label="Max amount"
            type="number"
            min="1"
            step="1"
            value={maxAmount}
            onChange={(event) => setMaxAmount(event.target.value)}
            hint="So tien toi da moi lan rut trong he thong."
          />
          <Button type="submit" loading={savingWithdrawal}>Luu withdrawal config</Button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Withdrawal configs gan nhat</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Danh sach nay doc truc tiep tu database de admin doi chieu threshold rut tien hien hanh.
            </p>
          </div>
          {withdrawalConfigs.length ? (
            <div className="space-y-3">
              {withdrawalConfigs.map((config) => (
                <div key={config.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{config.targetType}</p>
                  <p className="mt-1">Min: {config.minAmount} | Max: {config.maxAmount}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{formatDateTime(config.effectiveFrom)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chua co withdrawal config" description="Database chua co ban ghi withdrawal config nao." />
          )}
        </div>

        <div className="space-y-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Snapshot van hanh</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Tom tat nhanh de admin xac nhan fee va threshold rut tien dang active tren he thong.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fee active from</p>
            <p className="mt-2 font-semibold text-slate-900">{formatDateTime(activeFee?.effectiveFrom)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Withdrawal scope</p>
            <p className="mt-2 font-semibold text-slate-900">{targetTypes}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Withdrawal config active from</p>
            <p className="mt-2 font-semibold text-slate-900">{formatDateTime(latestWithdrawalConfig?.effectiveFrom)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsPage;
