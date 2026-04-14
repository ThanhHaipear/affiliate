import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createAffiliateLink } from "../../api/affiliateApi";
import { updateCartItem } from "../../api/orderApi";
import { getProductDetail } from "../../api/productApi";
import { trackAffiliateClick } from "../../api/trackingApi";
import Button from "../../components/common/Button";
import CopyBox from "../../components/common/CopyBox";
import EmptyState from "../../components/common/EmptyState";
import MoneyText from "../../components/common/MoneyText";
import SectionIntro from "../../components/storefront/SectionIntro";
import { useRole } from "../../hooks/useRole";
import { useToast } from "../../hooks/useToast";
import { getDeviceId, getProductAttribution, removeProductAttribution, saveProductAttribution } from "../../lib/affiliateAttribution";
import { mapProductDto } from "../../lib/apiMappers";
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
  const [selectedImage, setSelectedImage] = useState("");
  const [wishlisted, setWishlisted] = useState(false);
  const [trackedAffiliateSource, setTrackedAffiliateSource] = useState(null);

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

      if (cached?.shortCode === shortCode && active) {
        setTrackedAffiliateSource(cached);
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
        }
      } catch (_trackError) {
        if (cached && active) {
          setTrackedAffiliateSource(cached);
        }
      }
    }

    ensureAttribution();

    return () => {
      active = false;
    };
  }, [currentUser?.id, product?.id, searchParams]);

  const gallery = useMemo(() => product?.gallery?.length ? product.gallery : product ? [product.image] : [], [product]);
  const isOutOfStock = !product?.variant_id || Number(product?.stock || 0) <= 0;

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
        quantity: 1,
        attributionToken: trackedAffiliateSource?.token || undefined,
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
          <p className="text-sm leading-7 text-slate-600">{product.description || "Chưa có mô tả chi tiết."}</p>
          {isOutOfStock ? (
            <div className="rounded-[1.5rem] bg-rose-50 p-4 text-sm leading-7 text-rose-700">
              Sản phẩm này hiện đã hết hàng nên không thể thêm vào giỏ hàng hoặc mua ngay.
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
        <Panel title="Đánh giá giả lập" description="Trang này đã bỏ mock sản phẩm, nhưng khu vực review hiện tại vẫn là nội dung giao diện mô phỏng." />
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

export default ProductDetailPage;
