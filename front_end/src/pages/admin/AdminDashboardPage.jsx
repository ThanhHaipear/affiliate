import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminFinancialStats,
  getAdminOverview,
  getAdminProducts,
  setAdminProductVisibility,
} from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import DetailPanel from "../../components/admin/DetailPanel";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminOverview } from "../../lib/adminMappers";
import { mapProductDto } from "../../lib/apiMappers";
import { formatCompactCurrency, formatCurrency, formatDateTime } from "../../lib/format";

const PRODUCTS_PER_PAGE = 8;

function AdminDashboardPage() {
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [financialStats, setFinancialStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [productSubmittingId, setProductSubmittingId] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        setLoading(true);
        setError("");
        const [overviewResponse, financialStatsResponse, productsResponse] = await Promise.all([
          getAdminOverview(),
          getAdminFinancialStats(),
          getAdminProducts(),
        ]);

        if (!active) {
          return;
        }

        setOverview(mapAdminOverview(overviewResponse));
        setFinancialStats(financialStatsResponse || null);
        setProducts((productsResponse || []).map(mapProductDto));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được dữ liệu admin từ backend.");
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

  const productTotalPages = useMemo(
    () => Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE)),
    [products.length],
  );

  const paginatedProducts = useMemo(() => {
    const startIndex = (productPage - 1) * PRODUCTS_PER_PAGE;
    return products.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [productPage, products]);

  useEffect(() => {
    if (productPage > productTotalPages) {
      setProductPage(productTotalPages);
    }
  }, [productPage, productTotalPages]);

  async function handleToggleProductVisibility(product) {
    try {
      setProductSubmittingId(String(product.id));
      const updated = await setAdminProductVisibility(product.id, {
        visible: product.admin_hidden,
      });

      setProducts((current) =>
        current.map((item) => (String(item.id) === String(product.id) ? mapProductDto(updated) : item)),
      );
      toast.success(product.admin_hidden ? "Đã hiện lại sản phẩm." : "Đã ẩn sản phẩm.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được trạng thái hiển thị của sản phẩm.");
    } finally {
      setProductSubmittingId("");
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} cards={4} />;
  }

  if (error || !overview) {
    return (
      <EmptyState
        title="Không tải được bảng điều khiển admin"
        description={error || "Backend không trả về dữ liệu dashboard."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Tổng quan quản trị"
        description="Dashboard này đọc dữ liệu thật từ backend cho hàng chờ duyệt, tài chính nền tảng và danh sách sản phẩm để admin ẩn hoặc hiện trực tiếp."
        action={
          <Link to="/admin/products/pending">
            <Button>Mở hàng đợi duyệt</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Seller chờ duyệt" value={overview.counts.pendingSellers.toLocaleString("vi-VN")} meta="Hồ sơ seller đang chờ admin review" tone="cyan" />
        <AdminStatCard label="Affiliate chờ duyệt" value={overview.counts.pendingAffiliates.toLocaleString("vi-VN")} meta="Hồ sơ affiliate đang chờ admin review" tone="emerald" />
        <AdminStatCard label="Sản phẩm chờ duyệt" value={overview.counts.pendingProducts.toLocaleString("vi-VN")} meta="Số sản phẩm đang chờ một lần duyệt hợp nhất" tone="amber" />
        <AdminStatCard label="Hàng đợi affiliate phụ" value={overview.counts.pendingAffiliateSettings.toLocaleString("vi-VN")} meta="Số sản phẩm đang có thêm affiliate pending" tone="rose" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard label="Hoa hồng tạm tính" value={formatCompactCurrency(financialStats?.amounts?.pendingCommission || 0)} tooltip={formatCurrency(financialStats?.amounts?.pendingCommission || 0)} meta="Phát sinh sau checkout" tone="amber" />
        <AdminStatCard label="Hoa hồng đã ghi nhận" value={formatCompactCurrency(financialStats?.amounts?.settledCommission || 0)} tooltip={formatCurrency(financialStats?.amounts?.settledCommission || 0)} meta="Đã vào ví affiliate" tone="amber" />
        <AdminStatCard label="Phí nền tảng tạm tính" value={formatCompactCurrency(financialStats?.amounts?.pendingPlatformFee || 0)} tooltip={formatCurrency(financialStats?.amounts?.pendingPlatformFee || 0)} meta="Chưa vào ví nền tảng" tone="rose" />
        <AdminStatCard label="Phí nền tảng đã ghi nhận" value={formatCompactCurrency(financialStats?.amounts?.settledPlatformFee || 0)} tooltip={formatCurrency(financialStats?.amounts?.settledPlatformFee || 0)} meta="Đã vào ví nền tảng" tone="rose" />
        <AdminStatCard label="Seller net tạm tính" value={formatCompactCurrency(financialStats?.amounts?.pendingSellerNet || 0)} tooltip={formatCurrency(financialStats?.amounts?.pendingSellerNet || 0)} meta="Đang chờ seller xác nhận" tone="cyan" />
        <AdminStatCard label="Seller net đã ghi nhận" value={formatCompactCurrency(financialStats?.amounts?.settledSellerNet || 0)} tooltip={formatCurrency(financialStats?.amounts?.settledSellerNet || 0)} meta="Đã vào ví seller" tone="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <DetailPanel
          eyebrow="Ưu tiên xử lý"
          title="Hàng đợi chờ duyệt"
          footer={
            <div className="grid gap-3 sm:grid-cols-4">
              <Link to="/admin/sellers/pending">
                <Button className="w-full" variant="secondary">Seller</Button>
              </Link>
              <Link to="/admin/affiliates/pending">
                <Button className="w-full" variant="secondary">Affiliate</Button>
              </Link>
              <Link to="/admin/products/pending">
                <Button className="w-full" variant="secondary">Sản phẩm</Button>
              </Link>
              <Link to="/admin/withdrawals/pending">
                <Button className="w-full" variant="secondary">Rút tiền</Button>
              </Link>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-3">
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
          </div>
        </DetailPanel>

        <DetailPanel eyebrow="Phạm vi backend" title="Dữ liệu admin hiện có">
          <div className="space-y-3 text-sm leading-7 text-slate-300">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              Dashboard, tài khoản, đơn hàng, fraud alerts và phí nền tảng hiện đang đọc dữ liệu thật từ database.
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              Product moderation đã được hợp nhất về mặt giao diện và dashboard giờ có thêm khu vực ẩn hiện sản phẩm trực tiếp.
            </div>
          </div>
        </DetailPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <DetailPanel eyebrow="Hồ sơ mới" title="Các hồ sơ vừa gửi lên">
          <DataTable
            columns={[
              { key: "name", title: "Hồ sơ / sản phẩm", render: (row) => row.name || row.shopName || row.fullName },
              { key: "sellerName", title: "Shop", render: (row) => row.sellerName || row.shopName || "--" },
              { key: "ownerName", title: "Chủ sở hữu", render: (row) => row.ownerName || row.fullName || "--" },
              { key: "submittedAt", title: "Ngày gửi", render: (row) => formatDateTime(row.submittedAt) },
              {
                key: "status",
                title: "Trạng thái",
                render: (row) => <StatusBadge status={row.kycStatus || row.reviewStatus || row.status || "PENDING"} />,
              },
            ]}
            rows={latestApprovals}
            keyField="rowKey"
            emptyTitle="Không có dữ liệu chờ duyệt"
            emptyDescription="Dashboard backend hiện tại chưa có bản ghi đang chờ duyệt."
          />
        </DetailPanel>

        <DetailPanel eyebrow="Phạm vi API" title="Các module admin đang sẵn sàng">
          <div className="space-y-3">
            {[
              "Hàng đợi chờ duyệt: seller, affiliate, product moderation đã được hợp nhất theo từng sản phẩm.",
              "Tài khoản admin: danh sách account, khóa, mở khóa.",
              "Đơn hàng admin: tổng hợp order status, payment status, settlement.",
              "Phát hiện gian lận: fraud alerts từ database và trạng thái review thủ công.",
              "Cài đặt admin: platform fee active và withdrawal configs.",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </DetailPanel>
      </div>

      <DetailPanel
        eyebrow="Sản phẩm"
        title="Ẩn hiện sản phẩm ngay trên dashboard"
        footer={
          <Link to="/admin/products/pending">
            <Button variant="secondary">Mở khu vực sản phẩm</Button>
          </Link>
        }
      >
        <div className="space-y-4">
          <DataTable
            columns={[
              { key: "name", title: "Sản phẩm" },
              { key: "seller_name", title: "Seller" },
              { key: "price", title: "Giá", render: (row) => formatCurrency(row.price || 0) },
              { key: "approval_status", title: "Duyệt", render: (row) => <StatusBadge status={row.approval_status} /> },
              { key: "visibility_status", title: "Hiển thị", render: (row) => <StatusBadge status={row.visibility_status} /> },
              {
                key: "actions",
                title: "Thao tác",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/admin/products/${row.id}`}>
                      <Button size="sm" variant="secondary">Chi tiết</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant={row.admin_hidden ? "secondary" : "danger"}
                      loading={productSubmittingId === String(row.id)}
                      onClick={() => handleToggleProductVisibility(row)}
                    >
                      {row.admin_hidden ? "Hiện" : "Ẩn"}
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={paginatedProducts}
            emptyTitle="Chưa có sản phẩm"
            emptyDescription="Backend chưa trả về sản phẩm nào cho dashboard admin."
          />

          {products.length > PRODUCTS_PER_PAGE ? (
            <Pagination
              page={productPage}
              totalPages={productTotalPages}
              onPageChange={setProductPage}
            />
          ) : null}
        </div>
      </DetailPanel>
    </div>
  );
}

export default AdminDashboardPage;
