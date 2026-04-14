import { useEffect, useState } from "react";
import { getWalletSummary, getWithdrawalRequests } from "../../../api/walletApi";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import WalletSummary from "../../../components/wallet/WalletSummary";
import { mapWalletDto, mapWithdrawalDto } from "../../../lib/apiMappers";

function AffiliateWalletPage() {
  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const [walletResponse, withdrawalsResponse] = await Promise.all([
          getWalletSummary(),
          getWithdrawalRequests(),
        ]);

        if (!active) {
          return;
        }

        setWallet(mapWalletDto((walletResponse || [])[0] || {}));
        setWithdrawals((withdrawalsResponse || []).map(mapWithdrawalDto));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được ví affiliate.");
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

  if (loading) {
    return <EmptyState title="Đang tải ví affiliate" description="Hệ thống đang đồng bộ ví từ backend." />;
  }

  if (error) {
    return <EmptyState title="Không tải được ví affiliate" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate"
        title="Ví affiliate"
        description="Theo dõi số dư khả dụng, tiền đang xử lý và tình hình payout tổng thể."
      />
      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <WalletSummary
          title="Vi affiliate"
          titleClassName="text-emerald-700"
          balanceClassName="text-slate-950"
          availableBalance={wallet?.balance || 0}
          processingAmount={withdrawals.filter((item) => item.status === "APPROVED" || item.status === "PROCESSING").reduce((sum, item) => sum + item.amount, 0)}
          paidOutAmount={withdrawals.filter((item) => item.status === "PAID_OUT" || item.status === "PAID").reduce((sum, item) => sum + item.amount, 0)}
        />
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Tình hình payout</h3>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <div className="rounded-[1.5rem] bg-slate-50 p-4">Số dư khả dụng hiện được đọc trực tiếp từ ví backend.</div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4">Khoản đang xử lý là tổng các yêu cầu đang chờ payout.</div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4">Trang rút tiền cho biết chi tiết ngày gửi, trạng thái và ghi chú của từng yêu cầu.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AffiliateWalletPage;
