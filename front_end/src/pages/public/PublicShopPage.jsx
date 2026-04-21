import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProducts } from "../../api/productApi";
import { updateCartItem } from "../../api/orderApi";
import EmptyState from "../../components/common/EmptyState";
import FilterSidebar from "../../components/common/FilterSidebar";
import Pagination from "../../components/common/Pagination";
import ProductCard from "../../components/product/ProductCard";
import ProductFilter from "../../components/product/ProductFilter";
import SectionIntro from "../../components/storefront/SectionIntro";
import { useToast } from "../../hooks/useToast";
import { mapProductDto } from "../../lib/apiMappers";
import { useAuthStore } from "../../store/authStore";

const PRODUCTS_PER_PAGE = 6;

function PublicShopPage() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const response = await getProducts();

        if (!active) {
          return;
        }

        setProducts((response || []).map(mapProductDto));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được sản phẩm của shop.");
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
  }, [sellerId]);

  const shopProducts = useMemo(
    () => products.filter((product) => String(product.seller_id || "") === String(sellerId || "")),
    [products, sellerId],
  );

  const shopName = shopProducts[0]?.seller_name || `Shop #${sellerId}`;
  const categoryOptions = useMemo(
    () =>
      [...new Set(shopProducts.map((product) => product.category).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right, "vi"))
        .map((name) => ({ label: name, value: name })),
    [shopProducts],
  );

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const nextProducts = shopProducts.filter((product) => {
      const matchesKeyword =
        !keyword ||
        [product.name, product.description, product.category, product.seller_name]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      const matchesCategory = category === "ALL" || product.category === category;
      return matchesKeyword && matchesCategory;
    });

    if (sort === "price-asc") {
      nextProducts.sort((left, right) => (left.salePrice || left.price) - (right.salePrice || right.price));
    } else if (sort === "price-desc") {
      nextProducts.sort((left, right) => (right.salePrice || right.price) - (left.salePrice || left.price));
    } else {
      nextProducts.sort((left, right) => {
        const leftTime = new Date(left.raw?.updatedAt || left.raw?.createdAt || 0).getTime();
        const rightTime = new Date(right.raw?.updatedAt || right.raw?.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
    }

    return nextProducts;
  }, [category, search, shopProducts, sort]);

  useEffect(() => {
    setPage(1);
  }, [category, search, sort, sellerId]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  async function handleAddToCart(product) {
    if (submittingId) {
      return;
    }

    if (!currentUser) {
      navigate("/auth/login");
      return;
    }

    if (!product?.variant_id || Number(product.stock || 0) <= 0) {
      toast.error("Sản phẩm này hiện không thể thêm vào giỏ hàng.");
      return;
    }

    try {
      setSubmittingId(String(product.id));
      await updateCartItem({
        productId: Number(product.id),
        variantId: Number(product.variant_id),
        quantity: 1,
        mergeWithExisting: true,
      });
      toast.success("Đã thêm sản phẩm vào giỏ hàng.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không thêm được vào giỏ hàng.");
    } finally {
      setSubmittingId("");
    }
  }

  if (loading) {
    return <EmptyState title="Đang tải shop" description="Hệ thống đang lấy danh sách sản phẩm của shop." />;
  }

  if (error) {
    return <EmptyState title="Không tải được shop" description={error} />;
  }

  if (!shopProducts.length) {
    return (
      <EmptyState
        title="Shop chưa có sản phẩm hiển thị"
        description="Hiện chưa có sản phẩm nào của shop này đang được hiển thị trên marketplace."
      />
    );
  }

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Shop"
        title={shopName}
        description={`Cùng khám phá ${shopProducts.length} sản phẩm của shop nào!`}
      />

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <FilterSidebar title="Shop hiện tại">
          <div className="rounded-[1.5rem] bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Tổng sản phẩm</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{shopProducts.length}</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Danh mục đang bán</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{categoryOptions.length}</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            Dùng ô tìm kiếm và bộ lọc bên phải để xem nhanh đúng sản phẩm bạn cần trong shop này.
          </div>
        </FilterSidebar>

        <div className="space-y-6">
          <ProductFilter
            search={search}
            sort={sort}
            category={category}
            categories={categoryOptions}
            onSearchChange={setSearch}
            onSortChange={setSort}
            onCategoryChange={setCategory}
          />

          {filteredProducts.length ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    actionLabel={submittingId === String(product.id) ? "Đang tải..." : "Thêm vào giỏ"}
                    onAction={() => handleAddToCart(product)}
                  />
                ))}
              </div>

              {filteredProducts.length > PRODUCTS_PER_PAGE ? (
                <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Không có sản phẩm phù hợp"
              description="Thử đổi từ khóa tìm kiếm, danh mục hoặc cách sắp xếp trong shop này."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PublicShopPage;
