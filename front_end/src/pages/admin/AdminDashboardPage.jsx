import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminFinancialStats, getAdminOverview, getAdminWithdrawals } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import DetailPanel from "../../components/admin/DetailPanel";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import { mapAdminOverview } from "../../lib/adminMappers";
import { formatCompactCurrency, formatCurrency, formatDateTime } from "../../lib/format";

const DASHBOARD_ROWS_PER_PAGE = 8;
const LATEST_APPROVALS_LIMIT = 5;

const adminModules = [
  "Hàng đợi chờ duyệt: seller, affiliate, product moderation đã được hợp nhất theo từng sản phẩm.",
  "Trang sản phẩm admin đã được tách riêng khỏi bảng điều khiển để thao tác rõ ràng hơn.",
  "Tài khoản: danh sách account, khóa và mở khóa theo tài khoản hoặc theo vai trò.",
  "Đơn hàng: tổng hợp trạng thái đơn, thanh toán và yêu cầu hoàn tiền.",
  "Phát hiện gian lận: cảnh báo rủi ro từ database và trạng thái xử lý thủ công.",
  "Cài đặt: platform fee, snapshot tài chính và cấu hình rút tiền.",
];

function AdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [pendingWithdrawalCount, setPendingWithdrawalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approvalsPage, setApprovalsPage] = useState(1);
  const [modulesPage, setModulesPage] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        setLoading(true);
        setError("");
        const [overviewResponse, financialStatsResponse, pendingWithdrawalsResponse] = await Promise.all([
          getAdminOverview(),
          getAdminFinancialStats(),
          getAdminWithdrawals({ statuses: ["PENDING"] }),
        ]);

        if (!active) {
          return;
        }

        setOverview(mapAdminOverview(overviewResponse));
        setFinancialStats(financialStatsResponse || null);
        setPendingWithdrawalCount(Array.isArray(pendingWithdrawalsResponse) ? pendingWithdrawalsResponse.length : 0);
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được dữ liệu quản trị từ backend.");
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

    return [...overview.pendingSellers, ...overview.pendingAffiliates, ...overview.groupedPendingProducts].sort(
      (left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0),
    );
  }, [overview]);

  const approvalsTotalPages = Math.max(1, Math.ceil(latestApprovals.length / LATEST_APPROVALS_LIMIT));
  const currentApprovalsPage = Math.min(approvalsPage, approvalsTotalPages);
  const paginatedApprovals = useMemo(() => {
    const startIndex = (currentApprovalsPage - 1) * LATEST_APPROVALS_LIMIT;
    return latestApprovals.slice(startIndex, startIndex + LATEST_APPROVALS_LIMIT);
  }, [currentApprovalsPage, latestApprovals]);

  const modulesTotalPages = Math.max(1, Math.ceil(adminModules.length / DASHBOARD_ROWS_PER_PAGE));
  const currentModulesPage = Math.min(modulesPage, modulesTotalPages);
  const paginatedModules = useMemo(() => {
    const startIndex = (currentModulesPage - 1) * DASHBOARD_ROWS_PER_PAGE;
    return adminModules.slice(startIndex, startIndex + DASHBOARD_ROWS_PER_PAGE);
  }, [currentModulesPage]);

  if (loading) {
    return <LoadingSkeleton rows={5} cards={4} />;
  }

  if (error || !overview) {
    return (
      <EmptyState
        title="Không tải được bảng điều khiển"
        description={error || "Backend không trả về dữ liệu bảng điều khiển."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị"
        title="Bảng điều khiển"


      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard
          label="Hoa hồng tạm tính"
          value={formatCompactCurrency(financialStats?.amounts?.pendingCommission || 0)}
          tooltip={formatCurrency(financialStats?.amounts?.pendingCommission || 0)}
          meta="Chưa vào ví affiliate"
          tone="amber"
        />
        <AdminStatCard
          label="Hoa hồng đã ghi nhận"
          value={formatCompactCurrency(financialStats?.amounts?.settledCommission || 0)}
          tooltip={formatCurrency(financialStats?.amounts?.settledCommission || 0)}
          meta="Đã vào ví affiliate"
          tone="amber"
        />
        <AdminStatCard
          label="Phí nền tảng tạm tính"
          value={formatCompactCurrency(financialStats?.amounts?.pendingPlatformFee || 0)}
          tooltip={formatCurrency(financialStats?.amounts?.pendingPlatformFee || 0)}
          meta="Chưa vào ví nền tảng"
          tone="rose"
        />
        <AdminStatCard
          label="Phí nền tảng đã ghi nhận"
          value={formatCompactCurrency(financialStats?.amounts?.settledPlatformFee || 0)}
          tooltip={formatCurrency(financialStats?.amounts?.settledPlatformFee || 0)}
          meta="Đã vào ví nền tảng"
          tone="rose"
        />
        <AdminStatCard
          label="Seller net tạm tính"
          value={formatCompactCurrency(financialStats?.amounts?.pendingSellerNet || 0)}
          tooltip={formatCurrency(financialStats?.amounts?.pendingSellerNet || 0)}
          meta="Chưa vào ví seller"
          tone="cyan"
        />
        <AdminStatCard
          label="Seller net đã ghi nhận"
          value={formatCompactCurrency(financialStats?.amounts?.settledSellerNet || 0)}
          tooltip={formatCurrency(financialStats?.amounts?.settledSellerNet || 0)}
          meta="Đã vào ví seller"
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <DetailPanel
          eyebrow="Ưu tiên xử lý"
          title="Hàng đợi chờ duyệt"
          footer={
            <div className="grid gap-3 sm:grid-cols-4">
              <Link to="/admin/sellers/pending">
                <Button className="w-full" variant="secondary">
                  Seller
                </Button>
              </Link>
              <Link to="/admin/affiliates/pending">
                <Button className="w-full" variant="secondary">
                  Affiliate
                </Button>
              </Link>
              <Link to="/admin/products/pending">
                <Button className="w-full" variant="secondary">
                  Sản phẩm
                </Button>
              </Link>
              <Link to="/admin/withdrawals/pending">
                <Button className="w-full" variant="secondary">
                  Rút tiền
                </Button>
              </Link>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
              <p className="text-sm text-slate-300">Seller chờ duyệt</p>
              <p className="mt-2 text-3xl font-semibold text-white">{overview.counts.pendingSellers}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
              <p className="text-sm text-slate-300">Affiliate chờ duyệt</p>
              <p className="mt-2 text-3xl font-semibold text-white">{overview.counts.pendingAffiliates}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
              <p className="text-sm text-slate-300">Sản phẩm chờ duyệt</p>
              <p className="mt-2 text-3xl font-semibold text-white">{overview.counts.pendingProducts}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
              <p className="text-sm text-slate-300">Rút tiền chờ duyệt</p>
              <p className="mt-2 text-3xl font-semibold text-white">{pendingWithdrawalCount}</p>
            </div>
          </div>
        </DetailPanel>

        <DetailPanel eyebrow="Phạm vi backend" title="Dữ liệu admin hiện có">
          <div className="space-y-3 text-sm leading-7 text-slate-300">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              Bảng điều khiển, tài khoản, đơn hàng, cảnh báo gian lận và phí nền tảng.
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              Khu quản lý sản phẩm của admin đã được tách thành trang riêng để thao tác dễ hơn.
            </div>
          </div>
        </DetailPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <DetailPanel eyebrow="Hồ sơ / Sản phẩm mới" title="Vừa gửi lên">
          <div className="space-y-4">
            <DataTable
              columns={[
                {
                  key: "name",
                  title: "Hồ sơ / sản phẩm",
                  render: (row) => row.name || row.shopName || row.fullName,
                },
                {
                  key: "sellerName",
                  title: "Shop",
                  render: (row) => row.sellerName || row.shopName || "--",
                },
                {
                  key: "ownerName",
                  title: "Chủ sở hữu",
                  render: (row) => row.ownerName || row.fullName || "--",
                },
                {
                  key: "submittedAt",
                  title: "Ngày gửi",
                  render: (row) => formatDateTime(row.submittedAt),
                },
                {
                  key: "status",
                  title: "Trạng thái",
                  render: (row) => (
                    <StatusBadge status={row.kycStatus || row.reviewStatus || row.status || "PENDING"} />
                  ),
                },
              ]}
              rows={paginatedApprovals}
              keyField="rowKey"
              emptyTitle="Không có dữ liệu chờ duyệt"
              emptyDescription="Bảng điều khiển hiện chưa có bản ghi nào đang chờ duyệt."
            />

            {latestApprovals.length > LATEST_APPROVALS_LIMIT ? (
              <Pagination
                page={currentApprovalsPage}
                totalPages={approvalsTotalPages}
                onPageChange={setApprovalsPage}
              />
            ) : null}
          </div>
        </DetailPanel>

        <DetailPanel eyebrow="Phạm vi" title="Các module admin đang sẵn sàng">
          <div className="space-y-4">
            <div className="space-y-3">
              {paginatedModules.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>

            {adminModules.length > DASHBOARD_ROWS_PER_PAGE ? (
              <Pagination page={currentModulesPage} totalPages={modulesTotalPages} onPageChange={setModulesPage} />
            ) : null}
          </div>
        </DetailPanel>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
