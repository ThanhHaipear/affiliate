import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createAffiliateLink } from "../../api/affiliateApi";
import { updateCartItem } from "../../api/orderApi";
import { createProductReview, getProductDetail, getProductReviews } from "../../api/productApi";
import { getAffiliateLinkStatus, trackAffiliateClick } from "../../api/trackingApi";
import Button from "../../components/common/Button";
import CopyBox from "../../components/common/CopyBox";
import EmptyState from "../../components/common/EmptyState";
import MoneyText from "../../components/common/MoneyText";
import SectionIntro from "../../components/storefront/SectionIntro";
import { useRole } from "../../hooks/useRole";
import { useToast } from "../../hooks/useToast";
import { getDeviceId, getProductAttribution, removeProductAttribution, saveProductAttribution } from "../../lib/affiliateAttribution";
import { buildAccountActorLabel, mapProductDto } from "../../lib/apiMappers";
import { isWishlisted, toggleWishlist } from "../../lib/wishlist";
import { useAuthStore } from "../../store/authStore";

function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAffiliate, isCustomer } = useRole();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [reviewData, setReviewData] = useState({
    summary: { reviewCount: 0, ratingAverage: null },
    items: [],
    viewer: null,
  });
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [wishlisted, setWishlisted] = useState(false);
  const [trackedAffiliateSource, setTrackedAffiliateSource] = useState(null);
  const [affiliateLinkNotice, setAffiliateLinkNotice] = useState("");
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");
        const response = await getProductDetail(productId);
        if (!active) {
          return;
        }

        const mapped = mapProductDto(response);
        setProduct(mapped);
        setSelectedImage(mapped.gallery?.[0] || mapped.image);
        setWishlisted(isWishlisted(mapped.id));
        setQuantity("1");
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được chi tiết sản phẩm.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    const sync = () => {
      if (product?.id) {
        setWishlisted(isWishlisted(product.id));
      }
    };

    window.addEventListener("wishlist:changed", sync);
    return () => window.removeEventListener("wishlist:changed", sync);
  }, [product?.id]);

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      try {
        setReviewLoading(true);
        const response = await getProductReviews(productId);

        if (!active) {
          return;
        }

        setReviewData({
          summary: {
            reviewCount: Number(response?.summary?.reviewCount || 0),
            ratingAverage: response?.summary?.ratingAverage == null ? null : Number(response.summary.ratingAverage),
          },
          items: response?.items || [],
          viewer: response?.viewer || null,
        });
      } catch (_error) {
        if (active) {
          setReviewData({
            summary: { reviewCount: 0, ratingAverage: null },
            items: [],
            viewer: null,
          });
        }
      } finally {
        if (active) {
          setReviewLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    let active = true;

    async function ensureAttribution() {
      if (!product?.id) {
        return;
      }

      const shortCode = searchParams.get("ref");
      const cached = getProductAttribution(product.id);

      if (!shortCode) {
        removeProductAttribution(product.id);
        if (active) {
          setTrackedAffiliateSource(null);
        }
        return;
      }

      try {
        const linkStatus = await getAffiliateLinkStatus(shortCode);

        if (linkStatus?.status === "REVOKED") {
          removeProductAttribution(product.id);
          if (active) {
            setTrackedAffiliateSource(null);
            setAffiliateLinkNotice(
              `Link affiliate nay da bi vo hieu hoa boi ${buildAccountActorLabel(linkStatus.revokedByAccount, linkStatus.revokedBy)}. He thong se khong ghi nhan click hoac don hang tu link nay nua.`,
            );
          }
          navigate(`/products/${product.id}`, { replace: true });
          return;
        }
      } catch (statusError) {
        removeProductAttribution(product.id);
        if (active) {
          setTrackedAffiliateSource(null);
          setAffiliateLinkNotice(statusError.response?.data?.message || "Link affiliate nay khong con hop le.");
        }
        navigate(`/products/${product.id}`, { replace: true });
        return;
      }

      if (cached?.shortCode === shortCode && active) {
        setTrackedAffiliateSource(cached);
        setAffiliateLinkNotice("");
        return;
      }

      try {
        const tracked = await trackAffiliateClick({
          shortCode,
          viewerId: currentUser?.id,
          referrer: document.referrer || undefined,
          deviceId: getDeviceId(),
        });

        const attribution = {
          shortCode,
          token: tracked?.attribution?.token || tracked?.token || null,
          affiliateId: tracked?.link?.affiliateId || null,
          affiliateLinkId: tracked?.link?.id || null,
        };

        saveProductAttribution(product.id, attribution);
        if (active) {
          setTrackedAffiliateSource(attribution);
          setAffiliateLinkNotice("");
        }
      } catch (trackError) {
        removeProductAttribution(product.id);
        if (active) {
          setTrackedAffiliateSource(null);
          setAffiliateLinkNotice(trackError.response?.data?.message || "Link affiliate nay khong con hop le.");
        }
        navigate(`/products/${product.id}`, { replace: true });
      }
    }

    ensureAttribution();

    return () => {
      active = false;
    };
  }, [currentUser?.id, product?.id, searchParams]);

  const gallery = useMemo(() => product?.gallery?.length ? product.gallery : product ? [product.image] : [], [product]);
  const isOutOfStock = !product?.variant_id || Number(product?.stock || 0) <= 0;
  const maxQuantity = Math.max(1, Number(product?.stock || 0));
  const reviewViewer = reviewData.viewer || null;
  const canReviewProduct = Boolean(reviewViewer?.canReview);
  const reviewRestrictionMessage = reviewViewer?.reason || null;
  const soldCount = Number(product?.sold || 0);
  const reviewCount = Number(reviewData.summary.reviewCount || product?.review_count || 0);
  const ratingAverage =
    reviewData.summary.ratingAverage == null && product?.rating == null
      ? null
      : Number(reviewData.summary.ratingAverage ?? product?.rating);
  const normalizedQuantity = Math.min(
    maxQuantity,
    Math.max(1, Number.parseInt(quantity, 10) || 1),
  );

  function handleQuantityChange(nextValue) {
    const rawValue = String(nextValue ?? "");

    if (rawValue === "") {
      setQuantity("");
      return;
    }

    if (!/^\d+$/.test(rawValue)) {
      return;
    }

    const nextQuantity = Math.min(maxQuantity, Math.max(1, Number.parseInt(rawValue, 10)));
    setQuantity(String(nextQuantity));
  }

  function handleQuantityBlur() {
    setQuantity(String(normalizedQuantity));
  }

  async function handleAddToCart(redirectToCheckout = false) {
    if (!product?.variant_id) {
      toast.error("Sản phẩm này chưa có biến thể hợp lệ để đặt hàng.");
      return;
    }

    if (isOutOfStock) {
      toast.error("Sản phẩm đã hết hàng.");
      return;
    }

    try {
      setSubmitting(true);
      const cartItem = await updateCartItem({
        productId: Number(product.id),
        variantId: Number(product.variant_id),
        quantity: normalizedQuantity,
        attributionToken: trackedAffiliateSource?.token || undefined,
        mergeWithExisting: !redirectToCheckout,
      });
      toast.success("Đã thêm sản phẩm vào giỏ hàng.");
      if (redirectToCheckout && cartItem?.id) {
        navigate(`/dashboard/customer/checkout?items=${cartItem.id}`);
        return;
      }
      if (redirectToCheckout) {
        navigate("/dashboard/customer/cart");
      }
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không thêm được vào giỏ hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAffiliateLink() {
    try {
      setSubmitting(true);
      const response = await createAffiliateLink({ productId: Number(product.id) });
      const link = `${window.location.origin}/products/${product.id}?ref=${response.shortCode}`;
      setAffiliateLink(link);
      toast.success("Đã tạo link tiếp thị.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không tạo được link tiếp thị.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleWishlistToggle() {
    const next = toggleWishlist(product.id);
    const active = next.includes(String(product.id));
    setWishlisted(active);
    toast.success(active ? "Đã thêm vào wishlist." : "Đã bỏ khỏi wishlist.");
  }

  async function handleSubmitReview() {
    try {
      setReviewSubmitting(true);
      const response = await createProductReview(product.id, {
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      });

      const createdReview = {
        id: response.id,
        rating: response.rating,
        comment: response.comment || "",
        createdAt: response.createdAt,
        reviewerName:
          response.account?.customerProfile?.fullName ||
          response.account?.email ||
          currentUser?.email ||
          "Bạn",
        orderCode: response.orderItem?.order?.orderCode || null,
      };

      setReviewData((current) => {
        const nextItems = [createdReview, ...current.items];
        const nextReviewCount = nextItems.length;
        const nextRatingAverage =
          nextItems.reduce((sum, item) => sum + Number(item.rating || 0), 0) / Math.max(1, nextReviewCount);

        return {
          summary: {
            reviewCount: nextReviewCount,
            ratingAverage: nextRatingAverage,
          },
          items: nextItems,
          viewer: {
            hasPurchased: true,
            hasReviewed: true,
            canReview: false,
            reason: "Bạn đã đánh giá sản phẩm này rồi.",
          },
        };
      });

      setReviewRating("5");
      setReviewComment("");
      toast.success("Đã gửi đánh giá sản phẩm.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không gửi được đánh giá.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return <EmptyState title="Đang tải sản phẩm" description="Hệ thống đang đọc chi tiết sản phẩm từ database." />;
  }

  if (error || !product) {
    return <EmptyState title="Không tìm thấy sản phẩm" description={error || "Sản phẩm không tồn tại."} />;
  }

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Chi tiết sản phẩm"
        title={product.name}
        description={`${product.seller_name} | ${product.category}`}
      />
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <img
            src={selectedImage}
            alt={product.name}
            className="h-[420px] w-full rounded-[2rem] border border-slate-200 object-cover shadow-sm"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {gallery.map((image) => (
              <button
                key={image}
                type="button"
                onClick={() => setSelectedImage(image)}
                className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white"
              >
                <img src={image} alt={product.name} className="h-28 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {product.approval_status}
            </span>
            {isOutOfStock ? (
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">Hết hàng</span>
            ) : null}
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
            >
              <svg viewBox="0 0 24 24" className={`h-4 w-4 ${wishlisted ? "fill-rose-500 text-rose-500" : "fill-none text-slate-700"}`} stroke="currentColor" strokeWidth="1.8">
                <path d="M12 20.5 4.8 13.6a4.8 4.8 0 0 1 6.8-6.8L12 7.2l.4-.4a4.8 4.8 0 0 1 6.8 6.8Z" />
              </svg>
              {wishlisted ? "Đã lưu wishlist" : "Thêm vào wishlist"}
            </button>
          </div>
          <div className="flex items-end gap-3">
            <MoneyText value={product.price} className="text-4xl font-semibold text-slate-900" />
          </div>
          {soldCount > 0 || reviewCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {reviewCount > 0 && ratingAverage != null ? (
                <span className="font-semibold text-slate-900">{ratingAverage.toFixed(1)} / 5</span>
              ) : null}
              {reviewCount > 0 ? <span>{reviewCount} đánh giá</span> : null}
              {soldCount > 0 ? <span>{soldCount} đã bán</span> : null}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Shop" value={product.seller_name} />
            <InfoTile label="Danh mục" value={product.category} />
            <InfoTile label="Tồn kho" value={`${product.stock}`} />
            {isAffiliate ? (
              <InfoTile
                label="Hoa hồng affiliate"
                value={product.affiliate_enabled ? `${product.commission_value}%` : "Không áp dụng"}
              />
            ) : null}
          </div>
          {trackedAffiliateSource?.token ? (
            <div className="rounded-[1.5rem] bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
              Sản phẩm này đang được ghi nhận theo link tiếp thị liên kết. Nếu bạn thêm vào giỏ hoặc đặt đơn, hệ thống sẽ giữ attribution cho đơn hàng này.
            </div>
          ) : null}
          {affiliateLinkNotice ? (
            <div className="rounded-[1.5rem] bg-amber-50 p-4 text-sm leading-7 text-amber-900">
              {affiliateLinkNotice}
            </div>
          ) : null}
          <p className="text-sm leading-7 text-slate-600">{product.description || "Chưa có mô tả chi tiết."}</p>
          {isOutOfStock ? (
            <div className="rounded-[1.5rem] bg-rose-50 p-4 text-sm leading-7 text-rose-700">
              Sản phẩm này hiện đã hết hàng nên không thể thêm vào giỏ hàng hoặc mua ngay.
            </div>
          ) : null}
          {!isOutOfStock ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">So luong</p>
              <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  className="px-4 py-3 text-sm font-semibold text-slate-700"
                  onClick={() => handleQuantityChange(normalizedQuantity - 1)}
                  disabled={submitting || normalizedQuantity <= 1}
                >
                  -
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max={maxQuantity}
                  value={quantity}
                  onChange={(event) => handleQuantityChange(event.target.value)}
                  onBlur={handleQuantityBlur}
                  className="w-20 border-x border-slate-200 bg-white px-2 py-3 text-center text-sm text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  className="px-4 py-3 text-sm font-semibold text-slate-700"
                  onClick={() => handleQuantityChange(normalizedQuantity + 1)}
                  disabled={submitting || normalizedQuantity >= maxQuantity}
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button size="lg" loading={submitting} disabled={isOutOfStock} onClick={() => handleAddToCart(true)}>
              Mua ngay
            </Button>
            <Button size="lg" variant="secondary" loading={submitting} disabled={isOutOfStock} onClick={() => handleAddToCart(false)}>
              Thêm vào giỏ hàng
            </Button>
          </div>
          {isAffiliate ? (
            <>
              <div className="rounded-[1.5rem] bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                Chia sẻ sản phẩm này để nhận {product.commission_value}% hoa hồng khi đơn hàng hợp lệ.
              </div>
              <Button variant="outline" loading={submitting} onClick={handleCreateAffiliateLink}>
                Tạo nút chia sẻ affiliate
              </Button>
              {affiliateLink ? <CopyBox value={affiliateLink} label="Link tiếp thị cá nhân" /> : null}
            </>
          ) : null}
          {isCustomer && !isAffiliate ? (
            <div className="rounded-[1.5rem] bg-sky-50 p-4 text-sm leading-7 text-sky-900">
              Muốn giới thiệu sản phẩm này? Bạn có thể kích hoạt thêm vai trò affiliate trên cùng tài khoản khi cần.
            </div>
          ) : null}
          {!isCustomer && !isAffiliate ? (
            <p className="text-sm text-slate-500">Đăng nhập customer hoặc affiliate để thao tác với sản phẩm này.</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Mô tả chi tiết" description={product.description || "Chưa có mô tả từ seller."} />
        <Panel title="Thông tin giao hàng" description="Thông tin địa chỉ và phí giao hàng sẽ được xác nhận tại bước checkout." />
        <ReviewPanel
          isCustomer={isCustomer}
          items={reviewData.items}
          loading={reviewLoading}
          ratingAverage={ratingAverage}
          reviewComment={reviewComment}
          reviewCount={reviewCount}
          reviewRating={reviewRating}
          reviewSubmitting={reviewSubmitting}
          canReviewProduct={canReviewProduct}
          reviewRestrictionMessage={reviewRestrictionMessage}
          onReviewCommentChange={setReviewComment}
          onReviewRatingChange={setReviewRating}
          onSubmitReview={handleSubmitReview}
        />
      </div>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function Panel({ title, description }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function ReviewPanel({
  isCustomer,
  items,
  loading,
  ratingAverage,
  canReviewProduct,
  reviewComment,
  reviewCount,
  reviewRating,
  reviewRestrictionMessage,
  reviewSubmitting,
  onReviewCommentChange,
  onReviewRatingChange,
  onSubmitReview,
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">Đánh giá sản phẩm</h3>
      {loading ? (
        <p className="mt-4 text-sm leading-7 text-slate-600">Đang tải đánh giá thực tế của sản phẩm.</p>
      ) : (
        <>
          {reviewCount > 0 && ratingAverage != null ? (
            <p className="mt-4 text-sm font-medium text-slate-900">
              Điểm trung bình: {ratingAverage.toFixed(1)} / 5 từ {reviewCount} đánh giá
            </p>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-600">Chưa có đánh giá thực tế cho sản phẩm này.</p>
          )}
          {items.length ? (
            <div className="mt-4 space-y-4">
              {items.slice(0, 3).map((review) => (
                <div key={review.id} className="rounded-[1.5rem] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{review.reviewerName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {new Date(review.createdAt || Date.now()).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {review.rating}/5
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{review.comment || "Khách hàng chưa để lại bình luận."}</p>
                  {review.orderCode ? <p className="mt-2 text-xs text-slate-400">Đơn hàng: {review.orderCode}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
      {isCustomer && canReviewProduct ? (
        <div className="mt-5 space-y-3 rounded-[1.5rem] border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-900">Gửi đánh giá của bạn</p>
          <select
            value={reviewRating}
            onChange={(event) => onReviewRatingChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} sao
              </option>
            ))}
          </select>
          <textarea
            value={reviewComment}
            onChange={(event) => onReviewCommentChange(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
            placeholder="Chia sẻ cảm nhận của bạn sau khi mua sản phẩm"
          />
          <Button onClick={onSubmitReview} loading={reviewSubmitting}>
            Gửi đánh giá
          </Button>
          <p className="text-xs leading-6 text-slate-500">
            Chỉ khách hàng đã mua và có đơn hoàn tất mới gửi được đánh giá.
          </p>
        </div>
      ) : null}
      {isCustomer && !canReviewProduct && reviewRestrictionMessage ? (
        <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
          {reviewRestrictionMessage}
        </div>
      ) : null}
    </div>
  );
}

export default ProductDetailPage;
