import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminFinancialStats,
  getAdminOverview,
} from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import DetailPanel from "../../components/admin/DetailPanel";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { mapAdminOverview } from "../../lib/adminMappers";
import { formatCompactCurrency, formatCurrency, formatDateTime } from "../../lib/format";

function AdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        setLoading(true);
        setError("");
        const [overviewResponse, financialStatsResponse] = await Promise.all([
          getAdminOverview(),
          getAdminFinancialStats(),
        ]);

        if (!active) {
          return;
        }

        setOverview(mapAdminOverview(overviewResponse));
        setFinancialStats(financialStatsResponse || null);
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Khong tai duoc du lieu admin tu backend.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      active = false;
    };
  }, []);

  const latestApprovals = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [...overview.pendingSellers, ...overview.pendingAffiliates, ...overview.groupedPendingProducts]
      .sort((left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0))
      .slice(0, 6);
  }, [overview]);

  if (loading) {
    return <LoadingSkeleton rows={5} cards={4} />;
  }

  if (error || !overview) {
    return (
      <EmptyState
        title="Khong tai duoc bang dieu khien admin"
        description={error || "Backend khong tra ve du lieu dashboard."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Tong quan quan tri"
        description="Dashboard nay chi giu lai du lieu tong hop, hang doi duyet va tai chinh he thong. Quan ly san pham da duoc tach ra thanh trang rieng."
        action={(
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/products">
              <Button variant="secondary">Quan ly san pham</Button>
            </Link>
            <Link to="/admin/products/pending">
              <Button>Mo hang doi duyet</Button>
            </Link>
          </div>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Seller cho duyet" value={overview.counts.pendingSellers.toLocaleString("vi-VN")} meta="Ho so seller dang cho admin review" tone="cyan" />
        <AdminStatCard label="Affiliate cho duyet" value={overview.counts.pendingAffiliates.toLocaleString("vi-VN")} meta="Ho so affiliate dang cho admin review" tone="emerald" />
        <AdminStatCard label="San pham cho duyet" value={overview.counts.pendingProducts.toLocaleString("vi-VN")} meta="So san pham dang cho mot lan duyet hop nhat" tone="amber" />
        <AdminStatCard label="Hang doi affiliate phu" value={overview.counts.pendingAffiliateSettings.toLocaleString("vi-VN")} meta="So san pham dang co them affiliate pending" tone="rose" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard label="Hoa hong tam tinh" value={formatCompactCurrency(financialStats?.amounts?.pendingCommission || 0)} tooltip={formatCurrency(financialStats?.amounts?.pendingCommission || 0)} meta="Phat sinh sau checkout" tone="amber" />
        <AdminStatCard label="Hoa hong da ghi nhan" value={formatCompactCurrency(financialStats?.amounts?.settledCommission || 0)} tooltip={formatCurrency(financialStats?.amounts?.settledCommission || 0)} meta="Da vao vi affiliate" tone="amber" />
        <AdminStatCard label="Phi nen tang tam tinh" value={formatCompactCurrency(financialStats?.amounts?.pendingPlatformFee || 0)} tooltip={formatCurrency(financialStats?.amounts?.pendingPlatformFee || 0)} meta="Chua vao vi nen tang" tone="rose" />
        <AdminStatCard label="Phi nen tang da ghi nhan" value={formatCompactCurrency(financialStats?.amounts?.settledPlatformFee || 0)} tooltip={formatCurrency(financialStats?.amounts?.settledPlatformFee || 0)} meta="Da vao vi nen tang" tone="rose" />
        <AdminStatCard label="Seller net tam tinh" value={formatCompactCurrency(financialStats?.amounts?.pendingSellerNet || 0)} tooltip={formatCurrency(financialStats?.amounts?.pendingSellerNet || 0)} meta="Dang cho seller xac nhan" tone="cyan" />
        <AdminStatCard label="Seller net da ghi nhan" value={formatCompactCurrency(financialStats?.amounts?.settledSellerNet || 0)} tooltip={formatCurrency(financialStats?.amounts?.settledSellerNet || 0)} meta="Da vao vi seller" tone="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <DetailPanel
          eyebrow="Uu tien xu ly"
          title="Hang doi cho duyet"
          footer={(
            <div className="grid gap-3 sm:grid-cols-4">
              <Link to="/admin/sellers/pending">
                <Button className="w-full" variant="secondary">Seller</Button>
              </Link>
              <Link to="/admin/affiliates/pending">
                <Button className="w-full" variant="secondary">Affiliate</Button>
              </Link>
              <Link to="/admin/products/pending">
                <Button className="w-full" variant="secondary">San pham</Button>
              </Link>
              <Link to="/admin/withdrawals/pending">
                <Button className="w-full" variant="secondary">Rut tien</Button>
              </Link>
            </div>
          )}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
              <p className="text-sm text-slate-300">Seller cho duyet</p>
              <p className="mt-2 text-3xl font-semibold text-white">{overview.counts.pendingSellers}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
              <p className="text-sm text-slate-300">Affiliate cho duyet</p>
              <p className="mt-2 text-3xl font-semibold text-white">{overview.counts.pendingAffiliates}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
              <p className="text-sm text-slate-300">San pham cho duyet</p>
              <p className="mt-2 text-3xl font-semibold text-white">{overview.counts.pendingProducts}</p>
            </div>
          </div>
        </DetailPanel>

        <DetailPanel eyebrow="Pham vi backend" title="Du lieu admin hien co">
          <div className="space-y-3 text-sm leading-7 text-slate-300">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              Dashboard, tai khoan, don hang, fraud alerts va phi nen tang hien dang doc du lieu that tu database.
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              Khu quan ly san pham cua admin da duoc tach thanh trang rieng de admin thao tac ro hon, khong de chung trong dashboard tong quan nua.
            </div>
          </div>
        </DetailPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <DetailPanel eyebrow="Ho so moi" title="Cac ho so vua gui len">
          <DataTable
            columns={[
              { key: "name", title: "Ho so / san pham", render: (row) => row.name || row.shopName || row.fullName },
              { key: "sellerName", title: "Shop", render: (row) => row.sellerName || row.shopName || "--" },
              { key: "ownerName", title: "Chu so huu", render: (row) => row.ownerName || row.fullName || "--" },
              { key: "submittedAt", title: "Ngay gui", render: (row) => formatDateTime(row.submittedAt) },
              {
                key: "status",
                title: "Trang thai",
                render: (row) => <StatusBadge status={row.kycStatus || row.reviewStatus || row.status || "PENDING"} />,
              },
            ]}
            rows={latestApprovals}
            keyField="rowKey"
            emptyTitle="Khong co du lieu cho duyet"
            emptyDescription="Dashboard backend hien tai chua co ban ghi dang cho duyet."
          />
        </DetailPanel>

        <DetailPanel eyebrow="Pham vi API" title="Cac module admin dang san sang">
          <div className="space-y-3">
            {[
              "Hang doi cho duyet: seller, affiliate, product moderation da duoc hop nhat theo tung san pham.",
              "Quan ly san pham admin da duoc tach thanh trang rieng thay vi de chung trong dashboard tong quan.",
              "Tai khoan admin: danh sach account, khoa, mo khoa.",
              "Don hang admin: tong hop order status, payment status, settlement.",
              "Phat hien gian lan: fraud alerts tu database va trang thai review thu cong.",
              "Cai dat admin: platform fee active va withdrawal configs.",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </DetailPanel>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
