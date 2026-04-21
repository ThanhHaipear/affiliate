import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import FilterSidebar from "../../components/common/FilterSidebar";
import Pagination from "../../components/common/Pagination";
import ProductCard from "../../components/product/ProductCard";
import ProductFilter from "../../components/product/ProductFilter";
import SectionIntro from "../../components/storefront/SectionIntro";
import { getProducts } from "../../api/productApi";
import { mapProductDto } from "../../lib/apiMappers";

const PRODUCTS_PER_PAGE = 9;

function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [sort, setSort] = useState("latest");
  const [category, setCategory] = useState("ALL");
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page") || 1)));

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setPage(Math.max(1, Number(searchParams.get("page") || 1)));
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (search.trim()) {
      nextParams.set("search", search.trim());
    } else {
      nextParams.delete("search");
    }

    if (page > 1) {
      nextParams.set("page", String(page));
    } else {
      nextParams.delete("page");
    }

    setSearchParams(nextParams, { replace: true });
  }, [page, search, searchParams, setSearchParams]);

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

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  );

  const sellers = useMemo(
    () => [...new Set(products.map((product) => product.seller_name).filter(Boolean))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const next = products.filter((product) => {
      const matchedKeyword =
        !keyword ||
        [product.name, product.seller_name, product.category].join(" ").toLowerCase().includes(keyword);
      const matchedCategory = category === "ALL" || product.category === category;

      return matchedKeyword && matchedCategory;
    });

    if (sort === "price-asc") {
      next.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    } else if (sort === "price-desc") {
      next.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    } else if (sort === "commission-desc") {
      next.sort((a, b) => b.commission_value - a.commission_value);
    }

    return next;
  }, [category, products, search, sort]);

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
            categories={categories}
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
