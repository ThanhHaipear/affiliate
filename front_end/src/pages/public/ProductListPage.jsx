import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import FilterSidebar from "../../components/common/FilterSidebar";
import Pagination from "../../components/common/Pagination";
import ProductCard from "../../components/product/ProductCard";
import ProductFilter from "../../components/product/ProductFilter";
import SectionIntro from "../../components/storefront/SectionIntro";
import { getProductCategories, getProducts } from "../../api/productApi";
import { mapProductDto } from "../../lib/apiMappers";
import { useAuthStore } from "../../store/authStore";

const PRODUCTS_PER_PAGE = 9;
const DEFAULT_SORT = "latest";
const DEFAULT_CATEGORY = "ALL";

function normalizeCategoryValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roles = useAuthStore((state) => state.roles);
  const [products, setProducts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || DEFAULT_SORT);
  const [category, setCategory] = useState(searchParams.get("category") || DEFAULT_CATEGORY);
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page") || 1)));
  const canSortByCommission = roles.includes("affiliate") || currentUser?.profile?.affiliateStatus === "APPROVED";

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setSort(searchParams.get("sort") || DEFAULT_SORT);
    setCategory(searchParams.get("category") || DEFAULT_CATEGORY);
    setPage(Math.max(1, Number(searchParams.get("page") || 1)));
  }, [searchParams]);

  useEffect(() => {
    if (sort === "commission-desc" && !canSortByCommission) {
      setSort(DEFAULT_SORT);
    }
  }, [canSortByCommission, sort]);

  useEffect(() => {
    if (category === DEFAULT_CATEGORY || !categoryOptions.length) {
      return;
    }

    const normalizedCurrentCategory = normalizeCategoryValue(category);
    const matchedCategory = categoryOptions.find((item) =>
      [item.value, item.slug, item.name, item.id].some(
        (candidate) => normalizeCategoryValue(candidate) === normalizedCurrentCategory,
      ),
    );

    if (matchedCategory && matchedCategory.value !== category) {
      setCategory(matchedCategory.value);
    }
  }, [category, categoryOptions]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (search.trim()) {
      nextParams.set("search", search.trim());
    }

    if (category !== DEFAULT_CATEGORY) {
      nextParams.set("category", category);
    }

    if (sort !== DEFAULT_SORT) {
      nextParams.set("sort", sort);
    }

    if (page > 1) {
      nextParams.set("page", String(page));
    }

    setSearchParams(nextParams, { replace: true });
  }, [category, page, search, setSearchParams, sort]);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const [productsResponse, categoriesResponse] = await Promise.all([getProducts(), getProductCategories()]);
        if (!active) {
          return;
        }

        setProducts((productsResponse || []).map(mapProductDto));
        setCategoryOptions(
          (categoriesResponse || []).map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            value: item.slug || item.name || String(item.id),
            label: item.name,
          })),
        );
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

  const sellers = useMemo(
    () => [...new Set(products.map((product) => product.seller_name).filter(Boolean))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const normalizedSelectedCategory = normalizeCategoryValue(category);
    const selectedCategoryOption =
      category === DEFAULT_CATEGORY
        ? null
        : categoryOptions.find((item) =>
            [item.value, item.slug, item.name, item.id].some(
              (candidate) => normalizeCategoryValue(candidate) === normalizedSelectedCategory,
            ),
          );
    const acceptedCategoryValues = selectedCategoryOption
      ? [selectedCategoryOption.value, selectedCategoryOption.slug, selectedCategoryOption.name, selectedCategoryOption.id]
          .map(normalizeCategoryValue)
          .filter(Boolean)
      : [];
    const next = products.filter((product) => {
      const matchedKeyword =
        !keyword ||
        [product.name, product.seller_name, product.category].join(" ").toLowerCase().includes(keyword);
      const matchedCategory =
        category === DEFAULT_CATEGORY ||
        [product.category_slug, product.category, product.category_id]
          .map(normalizeCategoryValue)
          .some((candidate) => acceptedCategoryValues.includes(candidate) || candidate === normalizedSelectedCategory);

      return matchedKeyword && matchedCategory;
    });

    if (sort === "price-asc") {
      next.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    } else if (sort === "price-desc") {
      next.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    } else if (sort === "commission-desc" && canSortByCommission) {
      next.sort((a, b) => b.commission_value - a.commission_value);
    }

    return next;
  }, [canSortByCommission, category, categoryOptions, products, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, page]);

  function handleSearchChange(value) {
    setPage(1);
    setSearch(value);
  }

  function handleSortChange(value) {
    setPage(1);
    setSort(value);
  }

  function handleCategoryChange(value) {
    setPage(1);
    setCategory(value);
  }

  function handlePageChange(nextPage) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Marketplace"
        title="Danh sách sản phẩm"
        description="Trang này được thiết kế theo hướng ecommerce marketplace, rõ bộ lọc, trạng thái và thông tin shop."
      />
      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <FilterSidebar title="Bộ lọc sản phẩm">
          <div className="rounded-[1.5rem] bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Tổng sản phẩm</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{products.length}</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Shop đang hiển thị</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{sellers.length}</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            Sử dụng bộ lọc bên phải để tìm sản phẩm theo từ khóa, danh mục và cách sắp xếp.
          </div>
        </FilterSidebar>
        <div className="space-y-6">
          <ProductFilter
            search={search}
            sort={sort}
            category={category}
            categories={categoryOptions}
            canSortByCommission={canSortByCommission}
            onSearchChange={handleSearchChange}
            onSortChange={handleSortChange}
            onCategoryChange={handleCategoryChange}
          />

          {loading ? <EmptyState title="Đang tải sản phẩm" description="Hệ thống đang lấy danh sách sản phẩm từ backend." /> : null}
          {!loading && error ? <EmptyState title="Không tải được sản phẩm" description={error} /> : null}
          {!loading && !error && filteredProducts.length ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </>
          ) : null}
          {!loading && !error && !filteredProducts.length ? (
            <EmptyState
              title="Không có sản phẩm phù hợp"
              description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc quay lại tất cả sản phẩm."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ProductListPage;
