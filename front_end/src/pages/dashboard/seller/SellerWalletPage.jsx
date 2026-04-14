import { useEffect, useState } from "react";
import { getWalletSummary, getWithdrawalRequests } from "../../../api/walletApi";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import WalletSummary from "../../../components/wallet/WalletSummary";
import { mapWalletDto, mapWithdrawalDto } from "../../../lib/apiMappers";

function SellerWalletPage() {
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

        setWallet(mapWalletDto((walletResponse || []).find((item) => item.ownerType === "SELLER") || {}));
        setWithdrawals((withdrawalsResponse || []).map(mapWithdrawalDto));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được ví seller.");
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
    return <EmptyState title="Đang tải ví seller" description="Hệ thống đang đồng bộ dữ liệu ví seller từ backend." />;
  }

  if (error) {
    return <EmptyState title="Không tải được ví seller" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Ví seller"
        description="Tổng quan số dư hiện có, tiền đang xử lý và tổng tiền đã payout của seller."
      />
      <WalletSummary
        title="Ví seller"
        titleClassName="text-emerald-700"
        balanceClassName="text-slate-950"
        availableBalance={wallet?.balance || 0}
        processingAmount={withdrawals
          .filter((item) => item.status === "APPROVED" || item.status === "PROCESSING")
          .reduce((sum, item) => sum + item.amount, 0)}
        paidOutAmount={withdrawals
          .filter((item) => item.status === "PAID_OUT")
          .reduce((sum, item) => sum + item.amount, 0)}
        processingLabel="Đang xử lý"
        paidOutLabel="Đã payout"
      />
    </div>
  );
}

export default SellerWalletPage;
