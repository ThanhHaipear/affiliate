import { useEffect, useMemo, useState } from "react";
import { createAffiliateLink, getAffiliateMarketplaceProducts } from "../../../api/affiliateApi";
import CopyBox from "../../../components/common/CopyBox";
import EmptyState from "../../../components/common/EmptyState";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import Select from "../../../components/common/Select";
import ProductCard from "../../../components/product/ProductCard";
import { useToast } from "../../../hooks/useToast";
import { mapProductDto } from "../../../lib/apiMappers";

function AffiliateMarketplacePage({ products: initialProducts }) {
  const toast = useToast();
  const [products, setProducts] = useState(initialProducts || []);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("commission");
  const [loading, setLoading] = useState(!initialProducts);
  const [error, setError] = useState("");
  const [latestLink, setLatestLink] = useState("");
  const [latestProductName, setLatestProductName] = useState("");

  useEffect(() => {
    if (initialProducts) {
      return undefined;
    }

    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const response = await getAffiliateMarketplaceProducts();
        if (active) {
          setProducts((response || []).map(mapProductDto));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được sản phẩm affiliate.");
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
  }, [initialProducts]);

  async function handleCreateLink(product) {
    try {
      const response = await createAffiliateLink({ productId: Number(product.id) });
      const link = `${window.location.origin}/products/${product.id}?ref=${response.shortCode}`;
      setLatestLink(link);
      setLatestProductName(product.name);
      await navigator.clipboard.writeText(link);
      toast.success("Đã tạo link tiếp thị và hiển thị URL đầy đủ bên dưới.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không tạo được link tiếp thị.");
    }
  }

  const normalizedProducts = useMemo(
    () => products.map((product) => ("raw" in product || "approval_status" in product ? product : mapProductDto(product))),
    [products],
  );

  const approvedProducts = useMemo(() => {
    const filtered = normalizedProducts.filter(
      (product) =>
        product.affiliate_enabled &&
        product.approval_status === "APPROVED" &&
        product.affiliate_setting_status === "APPROVED" &&
        product.name.toLowerCase().includes(keyword.trim().toLowerCase()),
    );

    return [...filtered].sort((left, right) => {
      if (sortBy === "price-asc") {
        return left.price - right.price;
      }

      if (sortBy === "price-desc") {
        return right.price - left.price;
      }

      return right.commission_value - left.commission_value;
    });
  }, [keyword, normalizedProducts, sortBy]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate"
        title="Sản phẩm có thể tiếp thị"
        description="Danh sách sản phẩm được phép tham gia affiliate, hiển thị rõ shop, giá bán và mức hoa hồng."
      />
      <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_220px]">
        <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo tên sản phẩm..." />
        <Select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          options={[
            { label: "Hoa hồng cao nhất", value: "commission" },
            { label: "Giá thấp đến cao", value: "price-asc" },
            { label: "Giá cao đến thấp", value: "price-desc" },
          ]}
        />
      </div>
      {latestLink ? <CopyBox value={latestLink} label={`Link tiếp thị mới nhất${latestProductName ? ` | ${latestProductName}` : ""}`} /> : null}
      {loading ? <EmptyState title="Đang tải sản phẩm affiliate" description="Hệ thống đang lấy sản phẩm từ backend." /> : null}
      {!loading && error ? <EmptyState title="Không tải được sản phẩm" description={error} /> : null}
      {!loading && !error ? (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {approvedProducts.map((product) => (
            <ProductCard key={product.id} product={product} actionLabel="Lấy link tiếp thị" onAction={handleCreateLink} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default AffiliateMarketplacePage;
