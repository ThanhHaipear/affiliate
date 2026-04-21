import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../../api/productApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import { mapProductDto } from "../../../lib/apiMappers";
import { readWishlistIds, toggleWishlist } from "../../../lib/wishlist";

function CustomerWishlistPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlistIds, setWishlistIds] = useState(() => readWishlistIds());

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
          setError(loadError.response?.data?.message || "Không tải được wishlist.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    function syncWishlist() {
      setWishlistIds(readWishlistIds());
    }

    loadProducts();
    window.addEventListener("wishlist:changed", syncWishlist);

    return () => {
      active = false;
      window.removeEventListener("wishlist:changed", syncWishlist);
    };
  }, []);

  const wishlistProducts = useMemo(
    () => products.filter((item) => wishlistIds.includes(String(item.id))),
    [products, wishlistIds],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khách hàng"
        title="Sản phẩm yêu thích"
        description="Lưu những sản phẩm muốn quay lại xem sau và chuyển nhanh sang giỏ hàng khi sẵn sàng mua."
      />
      {loading ? <EmptyState title="Đang tải wishlist" description="Hệ thống đang lấy danh sách sản phẩm đã lưu." /> : null}
      {!loading && error ? <EmptyState title="Không tải được wishlist" description={error} /> : null}
      {!loading && !error && wishlistProducts.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {wishlistProducts.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row">
              <img src={item.image} alt={item.name} className="h-32 w-32 rounded-[1.5rem] object-cover" />
              <div className="flex-1">
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Yêu thích</span>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{item.name}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {item.seller_id ? (
                    <Link
                      to={`/shops/${item.seller_id}`}
                      className="text-sky-700 transition hover:text-sky-800 hover:underline"
                    >
                      {item.seller_name}
                    </Link>
                  ) : (
                    item.seller_name
                  )}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <MoneyText value={item.price} className="text-xl font-semibold text-slate-900" />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to={`/products/${item.id}`}>
                    <Button variant="secondary">Xem chi tiết</Button>
                  </Link>
                  <Button variant="outline" onClick={() => toggleWishlist(item.id)}>Bỏ khỏi wishlist</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {!loading && !error && !wishlistProducts.length ? (
        <EmptyState title="Chưa có sản phẩm yêu thích" description="Khi lưu sản phẩm, bạn có thể quay lại nhanh ở đây." />
      ) : null}
    </div>
  );
}

export default CustomerWishlistPage;
