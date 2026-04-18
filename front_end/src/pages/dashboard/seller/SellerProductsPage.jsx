import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getSellerProducts, setSellerProductVisibility } from "../../../api/productApi";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { mapProductDto } from "../../../lib/apiMappers";

function SellerProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState("");
  const [error, setError] = useState("");

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
          setError(loadError.response?.data?.message || "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c s\u1ea3n ph\u1ea9m c\u1ee7a seller.");
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

  const rows = useMemo(
    () => products.map((product) => ({
      ...product,
      price_label: product.price,
    })),
    [products],
  );

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
        title={"Qu\u1ea3n l\u00fd s\u1ea3n ph\u1ea9m"}
        description={"Danh s\u00e1ch s\u1ea3n ph\u1ea9m c\u1ee7a shop \u0111ang \u0111\u1ecdc tr\u1ef1c ti\u1ebfp t\u1eeb database seller products endpoint."}
        action={
          <Link to="/dashboard/seller/products/create">
            <Button>{"Th\u00eam s\u1ea3n ph\u1ea9m"}</Button>
          </Link>
        }
      />
      {loading ? <EmptyState title={"\u0110ang t\u1ea3i s\u1ea3n ph\u1ea9m"} description={"H\u1ec7 th\u1ed1ng \u0111ang \u0111\u1ecdc danh s\u00e1ch s\u1ea3n ph\u1ea9m c\u1ee7a shop."} /> : null}
      {!loading && error ? <EmptyState title={"Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c s\u1ea3n ph\u1ea9m"} description={error} /> : null}
      {!loading && !error ? (
        <DataTable
          columns={[
            { key: "name", title: "S\u1ea3n ph\u1ea9m" },
            { key: "category", title: "Danh m\u1ee5c" },
            { key: "price_label", title: "Gi\u00e1", render: (row) => <MoneyText value={row.price} /> },
            { key: "stock", title: "T\u1ed3n kho" },
            { key: "approval_status", title: "Tr\u1ea1ng th\u00e1i", render: (row) => <StatusBadge status={row.approval_status} /> },
            { key: "visibility_status", title: "Hi\u1ec3n th\u1ecb", render: (row) => <StatusBadge status={row.visibility_status} /> },
            {
              key: "actions",
              title: "Thao t\u00e1c",
              render: (row) => (
                <div className="flex gap-2">
                  <Link to={`/dashboard/seller/products/${row.id}`} className="text-sm font-medium text-sky-700">{"Chi ti\u1ebft"}</Link>
                  <Link to={`/dashboard/seller/products/${row.id}/edit`} className="text-sm font-medium text-emerald-700">{"Ch\u1ec9nh s\u1eeda"}</Link>
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
          rows={rows}
          emptyTitle={"Ch\u01b0a c\u00f3 s\u1ea3n ph\u1ea9m"}
          emptyDescription={"T\u1ea1o s\u1ea3n ph\u1ea9m \u0111\u1ea7u ti\u00ean \u0111\u1ec3 shop b\u1eaft \u0111\u1ea7u v\u1eadn h\u00e0nh."}
        />
      ) : null}
    </div>
  );
}

export default SellerProductsPage;
