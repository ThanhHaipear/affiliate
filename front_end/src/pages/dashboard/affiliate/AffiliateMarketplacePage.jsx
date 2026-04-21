import { useEffect, useMemo, useState } from "react";
import { createAffiliateLink, getAffiliateMarketplaceProducts } from "../../../api/affiliateApi";
import CopyBox from "../../../components/common/CopyBox";
import EmptyState from "../../../components/common/EmptyState";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import Select from "../../../components/common/Select";
import ProductCard from "../../../components/product/ProductCard";
import { useToast } from "../../../hooks/useToast";
import { mapProductDto } from "../../../lib/apiMappers";
import { copyText } from "../../../lib/clipboard";

const PRODUCTS_PER_PAGE = 9;

function AffiliateMarketplacePage({ products: initialProducts }) {
  const toast = useToast();
  const [products, setProducts] = useState(initialProducts || []);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("commission");
  const [page, setPage] = useState(1);
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
          setError(loadError.response?.data?.message || "Không tải được sản phẩm tiếp thị.");
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
      toast.success(
        copied
          ? "Đã tạo link tiếp thị và sao chép URL đầy đủ."
          : "Đã tạo link tiếp thị. Bạn có thể bấm sao chép ở ô URL bên dưới.",
      );
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

  useEffect(() => {
    setPage(1);
  }, [keyword, sortBy, products.length]);

  const totalPages = Math.max(1, Math.ceil(approvedProducts.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return approvedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [approvedProducts, currentPage]);

  const displayStart = paginatedProducts.length ? (currentPage - 1) * PRODUCTS_PER_PAGE + 1 : 0;
  const displayEnd = paginatedProducts.length ? Math.min(currentPage * PRODUCTS_PER_PAGE, approvedProducts.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Affiliate" title="Sản phẩm tiếp thị" />

      <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_220px]">
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm theo tên sản phẩm..."
        />
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

      {latestLink ? (
        <CopyBox value={latestLink} label={`Link tiếp thị mới nhất${latestProductName ? ` | ${latestProductName}` : ""}`} />
      ) : null}

      {loading ? <EmptyState title="Đang tải sản phẩm tiếp thị" description="Hệ thống đang lấy sản phẩm từ backend." /> : null}
      {!loading && error ? <EmptyState title="Không tải được sản phẩm" description={error} /> : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span>Có {approvedProducts.length} sản phẩm đủ điều kiện tiếp thị.</span>
            <span>
              Hiển thị {displayStart}-{displayEnd} / {approvedProducts.length}
            </span>
          </div>

          {paginatedProducts.length ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    showAffiliateInfo
                    actionLabel="Lấy link tiếp thị"
                    onAction={handleCreateLink}
                  />
                ))}
              </div>

              {approvedProducts.length > PRODUCTS_PER_PAGE ? (
                <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Chưa có sản phẩm phù hợp"
              description="Không có sản phẩm nào khớp với bộ lọc hiện tại hoặc chưa được duyệt cho affiliate."
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default AffiliateMarketplacePage;
