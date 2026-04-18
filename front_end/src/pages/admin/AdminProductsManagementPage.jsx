import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminProducts, setAdminProductVisibility } from "../../api/adminApi";
import FilterBar from "../../components/admin/FilterBar";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapProductDto } from "../../lib/apiMappers";
import { formatCurrency, formatDateTime } from "../../lib/format";

function AdminProductsManagementPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("ALL");
  const [visibilityStatus, setVisibilityStatus] = useState("ALL");
  const [submittingId, setSubmittingId] = useState("");

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
          setError(loadError.response?.data?.message || "Khong tai duoc danh sach san pham admin.");
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

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        [product.name, product.seller_name, product.category].join(" ").toLowerCase().includes(normalizedSearch);
      const matchesApproval = approvalStatus === "ALL" || product.approval_status === approvalStatus;
      const matchesVisibility = visibilityStatus === "ALL" || product.visibility_status === visibilityStatus;

      return matchesSearch && matchesApproval && matchesVisibility;
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
        if (product.admin_hidden) {
          result.hiddenByAdmin += 1;
        }
        return result;
      },
      { total: 0, approved: 0, visible: 0, hiddenByAdmin: 0 },
    );
  }, [filteredProducts]);

  async function handleToggleVisibility(product) {
    const shouldShowProduct = product.visibility_status !== "ACTIVE";

    try {
      setSubmittingId(String(product.id));
      const updated = await setAdminProductVisibility(product.id, {
        visible: shouldShowProduct,
      });

      setProducts((current) =>
        current.map((item) => (String(item.id) === String(product.id) ? mapProductDto(updated) : item)),
      );
      toast.success(shouldShowProduct ? "Da hien lai san pham." : "Da an san pham khoi marketplace.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc trang thai hien thi san pham.");
    } finally {
      setSubmittingId("");
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={6} cards={4} />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc san pham" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quan ly san pham"
        title="San pham cua toan he thong"
        description="Trang rieng de admin xem, loc, mo, an va di vao chi tiet tung san pham. Khong de chung trong dashboard tong quan nua."
        action={(
          <Link to="/admin/products/pending">
            <Button variant="secondary">Hang doi duyet</Button>
          </Link>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tong san pham" value={summary.total} hint="Theo bo loc hien tai" />
        <SummaryCard label="Da duyet" value={summary.approved} hint="Trang thai APPROVED" />
        <SummaryCard label="Dang hien thi" value={summary.visible} hint="ACTIVE tren marketplace" />
        <SummaryCard label="Bi admin an" value={summary.hiddenByAdmin} hint="HIDDEN_BY_ADMIN" />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tim theo ten san pham, seller hoac danh muc"
        filters={[
          {
            key: "approvalStatus",
            label: "Trang thai duyet",
            value: approvalStatus,
            onChange: setApprovalStatus,
            options: [
              { label: "Tat ca", value: "ALL" },
              { label: "APPROVED", value: "APPROVED" },
              { label: "PENDING", value: "PENDING" },
              { label: "REJECTED", value: "REJECTED" },
              { label: "DRAFT", value: "DRAFT" },
            ],
          },
          {
            key: "visibilityStatus",
            label: "Hien thi",
            value: visibilityStatus,
            onChange: setVisibilityStatus,
            options: [
              { label: "Tat ca", value: "ALL" },
              { label: "ACTIVE", value: "ACTIVE" },
              { label: "HIDDEN_BY_ADMIN", value: "HIDDEN_BY_ADMIN" },
              { label: "HIDDEN_BY_SELLER", value: "HIDDEN_BY_SELLER" },
            ],
          },
        ]}
      />

      <DataTable
        columns={[
          { key: "name", title: "San pham" },
          { key: "seller_name", title: "Seller" },
          { key: "category", title: "Danh muc" },
          { key: "price", title: "Gia", render: (row) => formatCurrency(row.price || 0) },
          { key: "stock", title: "Ton kho" },
          { key: "approval_status", title: "Duyet", render: (row) => <StatusBadge status={row.approval_status} /> },
          { key: "visibility_status", title: "Hien thi", render: (row) => <StatusBadge status={row.visibility_status} /> },
          { key: "updated_at", title: "Cap nhat", render: (row) => formatDateTime(row.raw?.updatedAt || row.raw?.createdAt) },
          {
            key: "actions",
            title: "Tac vu",
            render: (row) => {
              const shouldShowProduct = row.visibility_status !== "ACTIVE";

              return (
                <div className="flex flex-wrap gap-2">
                  <Link to={`/admin/products/${row.id}`}>
                    <Button size="sm" variant="secondary">Chi tiet</Button>
                  </Link>
                  <Button
                    size="sm"
                    variant={shouldShowProduct ? "secondary" : "danger"}
                    loading={submittingId === String(row.id)}
                    onClick={() => handleToggleVisibility(row)}
                  >
                    {shouldShowProduct ? "Hien" : "An"}
                  </Button>
                </div>
              );
            },
          },
        ]}
        rows={filteredProducts}
        emptyTitle="Khong co san pham"
        emptyDescription="Khong co san pham nao khop voi bo loc hien tai."
      />
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
