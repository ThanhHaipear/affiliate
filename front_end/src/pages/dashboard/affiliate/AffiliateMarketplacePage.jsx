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
import { copyText } from "../../../lib/clipboard";

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
          setError(loadError.response?.data?.message || "KhÃ´ng táº£i Ä‘Æ°á»£c sáº£n pháº©m affiliate.");
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
      const copied = await copyText(link);
      toast.success(copied ? "Đã tạo link tiếp thị và sao chép URL đầy đủ." : "Đã tạo link tiếp thị. Bạn có thể bấm sao chép ở ô URL bên dưới.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "KhÃ´ng táº¡o Ä‘Æ°á»£c link tiáº¿p thá»‹.");
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
        title="Sáº£n pháº©m cÃ³ thá»ƒ tiáº¿p thá»‹"
        description="Danh sÃ¡ch sáº£n pháº©m Ä‘Æ°á»£c phÃ©p tham gia affiliate, hiá»ƒn thá»‹ rÃµ shop, giÃ¡ bÃ¡n vÃ  má»©c hoa há»“ng."
      />
      <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_220px]">
        <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="TÃ¬m theo tÃªn sáº£n pháº©m..." />
        <Select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          options={[
            { label: "Hoa há»“ng cao nháº¥t", value: "commission" },
            { label: "GiÃ¡ tháº¥p Ä‘áº¿n cao", value: "price-asc" },
            { label: "GiÃ¡ cao Ä‘áº¿n tháº¥p", value: "price-desc" },
          ]}
        />
      </div>
      {latestLink ? <CopyBox value={latestLink} label={`Link tiáº¿p thá»‹ má»›i nháº¥t${latestProductName ? ` | ${latestProductName}` : ""}`} /> : null}
      {loading ? <EmptyState title="Äang táº£i sáº£n pháº©m affiliate" description="Há»‡ thá»‘ng Ä‘ang láº¥y sáº£n pháº©m tá»« backend." /> : null}
      {!loading && error ? <EmptyState title="KhÃ´ng táº£i Ä‘Æ°á»£c sáº£n pháº©m" description={error} /> : null}
      {!loading && !error ? (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {approvedProducts.map((product) => (
            <ProductCard key={product.id} product={product} actionLabel="Láº¥y link tiáº¿p thá»‹" onAction={handleCreateLink} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default AffiliateMarketplacePage;
