import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  approveAffiliateSetting,
  approveProduct,
  getAdminOverview,
  rejectAffiliateSetting,
  rejectProduct,
} from "../../api/adminApi";
import FilterBar from "../../components/admin/FilterBar";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminOverview } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

const PRODUCTS_PER_PAGE = 8;

const categoryOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Có catalog chờ duyệt", value: "CATALOG" },
  { label: "Có affiliate chờ duyệt", value: "AFFILIATE" },
];

function AdminPendingProductsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pendingProducts, setPendingProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [action, setAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [category, search]);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminOverview();
      setPendingProducts(mapAdminOverview(response).groupedPendingProducts);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được danh sách sản phẩm chờ duyệt.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    return pendingProducts.filter((product) => {
      const matchesSearch = [product.name, product.sellerName, product.productCategory]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      if (category === "CATALOG") {
        return matchesSearch && product.catalogReview.available;
      }

      if (category === "AFFILIATE") {
        return matchesSearch && product.affiliateReview.available;
      }

      return matchesSearch;
    });
  }, [category, pendingProducts, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredRows.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [currentPage, filteredRows]);

  async function handleConfirmAction() {
    if (!action?.row) {
      return;
    }

    try {
      setSubmitting(true);

      if (action.row.catalogReview.available) {
        await (
          action.type === "approve"
            ? approveProduct(action.row.catalogReview.reviewEntityId)
            : rejectProduct(action.row.catalogReview.reviewEntityId, { rejectReason })
        );
      } else if (action.row.affiliateReview.available) {
        await (
          action.type === "approve"
            ? approveAffiliateSetting(action.row.affiliateReview.reviewEntityId)
            : rejectAffiliateSetting(action.row.affiliateReview.reviewEntityId, { rejectReason })
        );
      }

      toast.success(
        action.type === "approve"
          ? "Đã duyệt sản phẩm và các cấu hình liên quan."
          : "Đã từ chối sản phẩm và các cấu hình liên quan.",
      );
      setAction(null);
      setRejectReason("");
      await loadProducts();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được trạng thái sản phẩm.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} cards={2} />;
  }

  if (error) {
    return <EmptyState title="Không tải được sản phẩm chờ duyệt" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Duyệt sản phẩm"
        title="Sản phẩm chờ duyệt"

      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm sản phẩm hoặc seller"
        filters={[
          {
            key: "category",

            value: category,
            onChange: setCategory,
            options: categoryOptions,
          },
        ]}
      />

      <DataTable
        columns={[
          { key: "name", title: "Sản phẩm" },
          { key: "sellerName", title: "Seller" },
          { key: "productCategory", title: "Danh mục" },
          {
            key: "price",
            title: "Giá / Giá gốc",
            render: (row) => (row.price ? row.price.toLocaleString("vi-VN") : "--"),
          },
          { key: "commissionRate", title: "Hoa hồng", render: (row) => row.commissionRate || "--" },
          { key: "submittedAt", title: "Ngày gửi", render: (row) => formatDateTime(row.submittedAt) },
          {
            key: "reviewStatus",
            title: "Trạng thái duyệt",
            render: (row) => (
              <div className="space-y-2">
                <StatusBadge status={row.reviewStatus} />
                <p className="text-xs text-slate-500">{row.reviewSummary}</p>
              </div>
            ),
          },
          {
            key: "actions",
            title: "Thao tác",
            render: (row) => (
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/admin/products/${row.productId}`}>
                  <Button size="sm" variant="secondary">Chi tiết</Button>
                </Link>
                <Button size="sm" onClick={() => setAction({ type: "approve", row })}>Duyệt</Button>
                <Button size="sm" variant="danger" onClick={() => setAction({ type: "reject", row })}>Từ chối</Button>
              </div>
            ),
          },
        ]}
        rows={paginatedRows}
        keyField="rowKey"
        emptyTitle="Không còn sản phẩm chờ duyệt"
        emptyDescription="Backend hiện tại không trả về sản phẩm pending nào."
      />

      {filteredRows.length > PRODUCTS_PER_PAGE ? (
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      ) : null}

      <ConfirmModal
        open={Boolean(action)}
        title={action?.type === "approve" ? "Duyệt sản phẩm" : "Từ chối sản phẩm"}
        description={`Xác nhận ${action?.type === "approve" ? "duyệt" : "từ chối"} ${action?.row?.name || "sản phẩm"}. Nếu sản phẩm đang có catalog và affiliate pending, hệ thống sẽ cập nhật cả hai cùng một lúc.`}
        confirmVariant={action?.type === "approve" ? "primary" : "danger"}
        onClose={() => {
          setAction(null);
          setRejectReason("");
        }}
        onConfirm={handleConfirmAction}
        loading={submitting}
      >
        {action?.type === "reject" ? (
          <Input
            label="Lý do từ chối"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Nêu rõ vấn đề về chính sách hoặc chất lượng"
          />
        ) : null}
      </ConfirmModal>
    </div>
  );
}

export default AdminPendingProductsPage;
