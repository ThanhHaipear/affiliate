import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminProducts, setAdminProductVisibility } from "../../api/adminApi";
import FilterBar from "../../components/admin/FilterBar";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmModal from "../../components/common/ConfirmModal";
import Input from "../../components/common/Input";
import { useToast } from "../../hooks/useToast";
import { mapProductDto } from "../../lib/apiMappers";
import { formatCurrency, formatDateTime } from "../../lib/format";

const PRODUCTS_PER_PAGE = 8;

function AdminProductsManagementPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("ALL");
  const [visibilityStatus, setVisibilityStatus] = useState("ALL");
  const [submittingId, setSubmittingId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedHideProduct, setSelectedHideProduct] = useState(null);
  const [hideReason, setHideReason] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const response = await getAdminProducts();
        if (active) {
          setProducts((response || []).map(mapProductDto));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được danh sách sản phẩm.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [approvalStatus, search, visibilityStatus]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products
      .filter((product) => {
        const matchesSearch =
          !normalizedSearch ||
          [product.name, product.seller_name, product.category].join(" ").toLowerCase().includes(normalizedSearch);
        const matchesApproval = approvalStatus === "ALL" || product.approval_status === approvalStatus;
        const matchesVisibility = visibilityStatus === "ALL" || product.visibility_status === visibilityStatus;

        return matchesSearch && matchesApproval && matchesVisibility;
      })
      .sort((left, right) => {
        const leftPending = left.approval_status === "PENDING" ? 1 : 0;
        const rightPending = right.approval_status === "PENDING" ? 1 : 0;

        if (leftPending !== rightPending) {
          return rightPending - leftPending;
        }

        const leftTime = new Date(left.raw?.updatedAt || left.raw?.createdAt || 0).getTime();
        const rightTime = new Date(right.raw?.updatedAt || right.raw?.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
  }, [approvalStatus, products, search, visibilityStatus]);

  const summary = useMemo(() => {
    return filteredProducts.reduce(
      (result, product) => {
        result.total += 1;
        if (product.approval_status === "APPROVED") {
          result.approved += 1;
        }
        if (product.visibility_status === "ACTIVE") {
          result.visible += 1;
        }
        if (product.admin_hidden || product.seller_hidden) {
          result.hidden += 1;
        }
        return result;
      },
      { total: 0, approved: 0, visible: 0, hidden: 0 },
    );
  }, [filteredProducts]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  async function handleToggleVisibility(product) {
    const shouldShowProduct = product.visibility_status !== "ACTIVE";

    if (!shouldShowProduct) {
      setSelectedHideProduct(product);
      setHideReason("");
      return;
    }

    try {
      setSubmittingId(String(product.id));
      const updated = await setAdminProductVisibility(product.id, {
        visible: true,
      });

      setProducts((current) =>
        current.map((item) => (String(item.id) === String(product.id) ? mapProductDto(updated) : item)),
      );
      toast.success("Đã hiện lại sản phẩm.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được trạng thái hiển thị sản phẩm.");
    } finally {
      setSubmittingId("");
    }
  }

  async function handleConfirmHide() {
    if (!selectedHideProduct) return;

    try {
      setSubmittingId(String(selectedHideProduct.id));
      const updated = await setAdminProductVisibility(selectedHideProduct.id, {
        visible: false,
        reason: hideReason.trim(),
      });

      setProducts((current) =>
        current.map((item) => (String(item.id) === String(selectedHideProduct.id) ? mapProductDto(updated) : item)),
      );
      toast.success("Đã ẩn sản phẩm khỏi marketplace.");
      setSelectedHideProduct(null);
      setHideReason("");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không ẩn được sản phẩm.");
    } finally {
      setSubmittingId("");
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={6} cards={4} />;
  }

  if (error) {
    return <EmptyState title="Không tải được sản phẩm" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sản phẩm"
        title="Sản phẩm"

        action={
          <Link to="/admin/products/pending">
            <Button variant="secondary">Hàng đợi duyệt</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng sản phẩm" value={summary.total} />
        <SummaryCard label="Đã duyệt" value={summary.approved} />
        <SummaryCard label="Đang có" value={summary.visible} />
        <SummaryCard label="Bị ẩn" value={summary.hidden} />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên sản phẩm, người bán hoặc danh mục"
        filters={[
          {
            key: "approvalStatus",

            value: approvalStatus,
            onChange: setApprovalStatus,
            options: [
              { label: "Tất cả", value: "ALL" },
              { label: "Đã duyệt", value: "APPROVED" },
              { label: "Đang chờ", value: "PENDING" },
              { label: "Đã từ chối", value: "REJECTED" },
              { label: "Bản nháp", value: "DRAFT" },
            ],
          },
          {
            key: "visibilityStatus",

            value: visibilityStatus,
            onChange: setVisibilityStatus,
            options: [
              { label: "Tất cả", value: "ALL" },
              { label: "Đang hoạt động", value: "ACTIVE" },
              { label: "Bị admin ẩn", value: "HIDDEN_BY_ADMIN" },
              { label: "Bị người bán ẩn", value: "HIDDEN_BY_SELLER" },
            ],
          },
        ]}
      />

      <DataTable
        columns={[
          { key: "name", title: "Sản phẩm" },
          { key: "seller_name", title: "Người bán" },
          { key: "category", title: "Danh mục" },
          { key: "price", title: "Giá", render: (row) => formatCurrency(row.price || 0) },
          { key: "stock", title: "Tồn kho" },
          {
            key: "approval_status",
            title: "Duyệt",
            render: (row) => <StatusBadge status={row.approval_status} />,
          },
          {
            key: "visibility_status",
            title: "Hiển thị",
            render: (row) => <StatusBadge status={row.visibility_status} />,
          },
          {
            key: "updated_at",
            title: "Cập nhật",
            render: (row) => formatDateTime(row.raw?.updatedAt || row.raw?.createdAt),
          },
          {
            key: "actions",
            title: "Tác vụ",
            render: (row) => {
              const shouldShowProduct = row.visibility_status !== "ACTIVE";

              return (
                <div className="flex flex-wrap gap-2">
                  <Link to={`/admin/products/${row.id}`}>
                    <Button size="sm" variant="secondary">
                      Chi tiết
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant={shouldShowProduct ? "secondary" : "danger"}
                    loading={submittingId === String(row.id)}
                    onClick={() => handleToggleVisibility(row)}
                  >
                    {shouldShowProduct ? "Hiện" : "Ẩn"}
                  </Button>
                </div>
              );
            },
          },
        ]}
        rows={paginatedProducts}
        emptyTitle="Không có sản phẩm"
        emptyDescription="Không có sản phẩm nào khớp với bộ lọc hiện tại."
      />

      {filteredProducts.length > PRODUCTS_PER_PAGE ? (
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      ) : null}

      <ConfirmModal
        open={Boolean(selectedHideProduct)}
        title="Ẩn sản phẩm"
        description={selectedHideProduct ? `Xác nhận ẩn sản phẩm ${selectedHideProduct.name} khỏi marketplace.` : ""}
        confirmVariant="danger"
        confirmLabel="Khóa ngay"
        disabled={hideReason.trim().length < 5}
        loading={submittingId === String(selectedHideProduct?.id)}
        onClose={() => {
          setSelectedHideProduct(null);
          setHideReason("");
        }}
        onConfirm={handleConfirmHide}
      >
        <Input
          label="Lý do khóa/ẩn (bắt buộc)"
          value={hideReason}
          onChange={(event) => setHideReason(event.target.value)}
          placeholder="Ví dụ: Vi phạm chính sách hàng giả (tối thiểu 5 ký tự)"
        />
      </ConfirmModal>
    </div>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-[2rem] border border-slate-300 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{Number(value || 0).toLocaleString("vi-VN")}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default AdminProductsManagementPage;
