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
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminOverview } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

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

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminOverview();
      setPendingProducts(mapAdminOverview(response).groupedPendingProducts);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Khong tai duoc danh sach san pham cho duyet.");
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => {
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

  async function handleConfirmAction() {
    if (!action?.row) {
      return;
    }

    try {
      setSubmitting(true);
      const requests = [];

      if (action.row.catalogReview.available) {
        requests.push(
          action.type === "approve"
            ? approveProduct(action.row.catalogReview.reviewEntityId)
            : rejectProduct(action.row.catalogReview.reviewEntityId, { rejectReason }),
        );
      }

      if (action.row.affiliateReview.available) {
        requests.push(
          action.type === "approve"
            ? approveAffiliateSetting(action.row.affiliateReview.reviewEntityId)
            : rejectAffiliateSetting(action.row.affiliateReview.reviewEntityId, { rejectReason }),
        );
      }

      await Promise.all(requests);
      toast.success(
        action.type === "approve"
          ? "Da duyet san pham va cac cau hinh lien quan."
          : "Da tu choi san pham va cac cau hinh lien quan.",
      );
      setAction(null);
      setRejectReason("");
      await loadProducts();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc trang thai san pham.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} cards={2} />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc product pending" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Product review"
        title="Pending products"
        description="Moi san pham chi duyet mot lan. Khi admin approve hoac reject, he thong se cap nhat toan bo phan catalog va affiliate dang cho duyet cua san pham do."
      />
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search product or seller"
        filters={[
          {
            key: "category",
            label: "Pending scope",
            value: category,
            onChange: setCategory,
            options: [
              { label: "Tat ca", value: "ALL" },
              { label: "Co catalog pending", value: "CATALOG" },
              { label: "Co affiliate pending", value: "AFFILIATE" },
            ],
          },
        ]}
      />
      <DataTable
        columns={[
          { key: "name", title: "Product" },
          { key: "sellerName", title: "Seller" },
          { key: "productCategory", title: "Danh muc" },
          { key: "price", title: "Price / Base", render: (row) => (row.price ? row.price.toLocaleString("vi-VN") : "--") },
          { key: "commissionRate", title: "Commission", render: (row) => row.commissionRate || "--" },
          { key: "submittedAt", title: "Submitted", render: (row) => formatDateTime(row.submittedAt) },
          {
            key: "reviewStatus",
            title: "Review status",
            render: (row) => (
              <div className="space-y-2">
                <StatusBadge status={row.reviewStatus} />
                <p className="text-xs text-slate-500">{row.reviewSummary}</p>
              </div>
            ),
          },
          {
            key: "actions",
            title: "Actions",
            render: (row) => (
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/admin/products/${row.productId}`}>
                  <Button size="sm" variant="secondary">Detail</Button>
                </Link>
                <Button size="sm" onClick={() => setAction({ type: "approve", row })}>Approve</Button>
                <Button size="sm" variant="danger" onClick={() => setAction({ type: "reject", row })}>Reject</Button>
              </div>
            ),
          },
        ]}
        rows={rows}
        keyField="rowKey"
        emptyTitle="Khong con san pham cho duyet"
        emptyDescription="Backend hien tai khong tra ve san pham pending nao."
      />
      <ConfirmModal
        open={Boolean(action)}
        title={action?.type === "approve" ? "Approve product" : "Reject product"}
        description={`Xac nhan ${action?.type === "approve" ? "duyet" : "tu choi"} ${action?.row?.name || "san pham"}. Neu san pham dang co catalog va affiliate pending, he thong se cap nhat ca hai cung mot luc.`}
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
            label="Reject reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Explain policy or quality issue"
          />
        ) : null}
      </ConfirmModal>
    </div>
  );
}

export default AdminPendingProductsPage;
