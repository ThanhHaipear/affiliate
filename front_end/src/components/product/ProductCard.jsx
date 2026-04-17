import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import MoneyText from "../common/MoneyText";
import { formatStatusLabel } from "../../lib/format";
import { isWishlisted, toggleWishlist } from "../../lib/wishlist";

function ProductCard({ product, actionLabel, onAction }) {
  const [wishlisted, setWishlisted] = useState(() => isWishlisted(product.id));
  const showAffiliateInfo = Boolean(actionLabel);
  const stock = Number(product.stock || 0);
  const isOutOfStock = stock <= 0;
  const soldCount = Number(product.sold || 0);
  const reviewCount = Number(product.review_count || 0);
  const hasReviewSummary = soldCount > 0 || reviewCount > 0;

  useEffect(() => {
    const sync = () => setWishlisted(isWishlisted(product.id));
    window.addEventListener("wishlist:changed", sync);
    return () => window.removeEventListener("wishlist:changed", sync);
  }, [product.id]);

  function handleWishlistToggle() {
    const next = toggleWishlist(product.id);
    setWishlisted(next.includes(String(product.id)));
  }

  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-300 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative">
        <img src={product.image} alt={product.name} className="h-56 w-full object-cover" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {(product.badges || []).slice(0, 2).map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow"
            >
              {badge}
            </span>
          ))}
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium shadow ${
              isOutOfStock
                ? "bg-rose-50 text-rose-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isOutOfStock ? "Hết hàng" : `Còn ${stock} sản phẩm`}
          </span>
        </div>
        <button
          type="button"
          onClick={handleWishlistToggle}
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 shadow"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <svg viewBox="0 0 24 24" className={`h-5 w-5 ${wishlisted ? "fill-rose-500 text-rose-500" : "fill-none text-slate-700"}`} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 20.5 4.8 13.6a4.8 4.8 0 0 1 6.8-6.8L12 7.2l.4-.4a4.8 4.8 0 0 1 6.8 6.8Z" />
          </svg>
        </button>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">{product.category}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{product.name}</h3>
          </div>
          {hasReviewSummary ? (
            <div className="text-right">
              {reviewCount > 0 && product.rating != null ? (
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  {Number(product.rating).toFixed(1)} / 5
                </p>
              ) : null}
              {soldCount > 0 ? (
                <p className="mt-1 text-sm text-slate-500">{soldCount} đã bán</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <p className="text-sm leading-7 text-slate-600">{product.description}</p>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <p className="text-xl font-semibold text-slate-900">
              <MoneyText value={product.salePrice || product.price} />
            </p>
            {product.salePrice ? (
              <span className="text-sm text-slate-400 line-through">
                {(product.price || 0).toLocaleString("vi-VN")} VND
              </span>
            ) : null}
          </div>
          <p className="mt-3">
            Shop: <span className="font-medium text-slate-900">{product.seller_name}</span>
          </p>
          <p className={`mt-1 text-xs font-medium ${isOutOfStock ? "text-rose-600" : "text-emerald-600"}`}>
            {isOutOfStock ? "Sản phẩm hiện đã hết hàng" : `Còn ${stock} sản phẩm có thể mua`}
          </p>
          {showAffiliateInfo ? (
            <>
              <p className="mt-1">
                Hoa hồng:{" "}
                <span className="font-medium text-emerald-700">
                  {product.commission_value}%
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Trạng thái affiliate: {formatStatusLabel(product.affiliate_setting_status)}
              </p>
            </>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={`/products/${product.id}`} className="flex-1">
            <Button variant="secondary" className="w-full border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200">
              Xem chi tiết
            </Button>
          </Link>
          {actionLabel ? (
            <Button className="flex-1" onClick={() => onAction?.(product)}>
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
