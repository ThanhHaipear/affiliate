import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getSellerProducts, setSellerProductVisibility } from "../../../api/productApi";
import FilterBar from "../../../components/admin/FilterBar";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { mapProductDto } from "../../../lib/apiMappers";

const PRODUCTS_PER_PAGE = 8;

function SellerProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const response = await getSellerProducts();
        if (active) {
          setProducts((response || []).map(mapProductDto));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được sản phẩm của seller.");
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
  }, [search, categoryFilter, visibilityFilter]);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort();
    return [
      { label: "Tất cả danh mục", value: "ALL" },
      ...categories.map((category) => ({
        label: category,
        value: category,
      })),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products
      .filter((product) => {
        const matchesSearch = !normalizedSearch || String(product.name || "").toLowerCase().includes(normalizedSearch);
        const matchesCategory = categoryFilter === "ALL" || product.category === categoryFilter;
        const matchesVisibility =
          visibilityFilter === "ALL" || product.visibility_status === visibilityFilter;

        return matchesSearch && matchesCategory && matchesVisibility;
      })
      .sort((left, right) => {
        const leftPendingWeight = left.approval_status === "PENDING" ? 1 : 0;
        const rightPendingWeight = right.approval_status === "PENDING" ? 1 : 0;

        if (leftPendingWeight !== rightPendingWeight) {
          return rightPendingWeight - leftPendingWeight;
        }

        const leftTime = new Date(left.raw?.updatedAt || left.raw?.createdAt || 0).getTime();
        const rightTime = new Date(right.raw?.updatedAt || right.raw?.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
  }, [products, search, categoryFilter, visibilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  async function handleToggleVisibility(product) {
    try {
      setSubmittingId(String(product.id));
      const nextVisible = product.seller_hidden || product.admin_hidden;

      if (product.admin_hidden && nextVisible) {
        toast.error("Sản phẩm đang bị admin ẩn nên seller không thể tự mở lại.");
        return;
      }

      const updated = await setSellerProductVisibility(product.id, {
        visible: nextVisible,
      });

      setProducts((current) =>
        current.map((item) => (String(item.id) === String(product.id) ? mapProductDto(updated) : item)),
      );
      toast.success(nextVisible ? "Đã mở lại sản phẩm." : "Đã ẩn sản phẩm khỏi shop.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được trạng thái hiển thị.");
    } finally {
      setSubmittingId("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Quản lý sản phẩm"

        action={
          <Link to="/dashboard/seller/products/create">
            <Button>Thêm sản phẩm</Button>
          </Link>
        }
      />

      {loading ? (
        <EmptyState
          title="Đang tải sản phẩm"
          description="Hệ thống đang đọc danh sách sản phẩm của shop."
        />
      ) : null}

      {!loading && error ? <EmptyState title="Không tải được sản phẩm" description={error} /> : null}

      {!loading && !error ? (
        <>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm theo tên sản phẩm"
            filters={[
              {
                key: "category",
                label: "Danh mục",
                value: categoryFilter,
                onChange: setCategoryFilter,
                options: categoryOptions,
              },
              {
                key: "visibility",
                label: "Hiển thị",
                value: visibilityFilter,
                onChange: setVisibilityFilter,
                options: [
                  { label: "Tất cả trạng thái", value: "ALL" },
                  { label: "Đang hiển thị", value: "ACTIVE" },
                  { label: "Bị người bán ẩn", value: "HIDDEN_BY_SELLER" },
                  { label: "Bị admin ẩn", value: "HIDDEN_BY_ADMIN" },
                ],
              },
            ]}
          />

          <DataTable
            columns={[
              { key: "name", title: "Sản phẩm" },
              { key: "category", title: "Danh mục" },
              { key: "price_label", title: "Giá", render: (row) => <MoneyText value={row.price} /> },
              { key: "stock", title: "Tồn kho" },
              {
                key: "approval_status",
                title: "Trạng thái duyệt",
                render: (row) => <StatusBadge status={row.approval_status} />,
              },
              {
                key: "visibility_status",
                title: "Hiển thị",
                render: (row) => <StatusBadge status={row.visibility_status} />,
              },
              {
                key: "actions",
                title: "Thao tác",
                render: (row) => (
                  <div className="flex gap-2">
                    <Link to={`/dashboard/seller/products/${row.id}`} className="text-sm font-medium text-sky-700">
                      Chi tiết
                    </Link>
                    <Link
                      to={`/dashboard/seller/products/${row.id}/edit`}
                      className="text-sm font-medium text-emerald-700"
                    >
                      Chỉnh sửa
                    </Link>
                    <Button
                      size="sm"
                      variant={row.seller_hidden || row.admin_hidden ? "secondary" : "ghost"}
                      loading={submittingId === String(row.id)}
                      onClick={() => handleToggleVisibility(row)}
                    >
                      {row.seller_hidden || row.admin_hidden ? "Hiện" : "Ẩn"}
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={paginatedProducts}
            emptyTitle="Chưa có sản phẩm"
            emptyDescription="Tạo sản phẩm đầu tiên để shop bắt đầu vận hành."
          />

          {filteredProducts.length > PRODUCTS_PER_PAGE ? (
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default SellerProductsPage;
