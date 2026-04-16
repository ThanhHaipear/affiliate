import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  approveAffiliateSetting,
  approveProduct,
  getAdminOverview,
  rejectAffiliateSetting,
  rejectProduct,
} from "../../api/adminApi";
import DetailPanel from "../../components/admin/DetailPanel";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminOverview, parseAdminProductRouteId } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

function AdminProductDetailPage() {
  const toast = useToast();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [action, setAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  useEffect(() => {
    loadProduct();
  }, [id]);

  async function loadProduct() {
    const parsed = parseAdminProductRouteId(id);

    try {
      setLoading(true);
      setError("");
      const response = await getAdminOverview();
      const overview = mapAdminOverview(response);
      const match = overview.groupedPendingProducts.find((item) => {
        if (item.productId === parsed.productId) {
          return true;
        }

        return (
          item.catalogReview.reviewEntityId === parsed.reviewEntityId ||
          item.affiliateReview.reviewEntityId === parsed.reviewEntityId
        );
      });

      setProduct(match || null);
      setSelectedImage(match?.gallery?.[0] || "");
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được chi tiết sản phẩm.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAction() {
    if (!product) {
      return;
    }

    try {
      setSubmitting(true);
      if (product.catalogReview.available) {
        await (
          action === "approve"
            ? approveProduct(product.catalogReview.reviewEntityId)
            : rejectProduct(product.catalogReview.reviewEntityId, { rejectReason })
        );
      } else if (product.affiliateReview.available) {
        await (
          action === "approve"
            ? approveAffiliateSetting(product.affiliateReview.reviewEntityId)
            : rejectAffiliateSetting(product.affiliateReview.reviewEntityId, { rejectReason })
        );
      }

      toast.success(
        action === "approve"
          ? "Đã duyệt sản phẩm và các cấu hình liên quan."
          : "Đã từ chối sản phẩm và các cấu hình liên quan.",
      );
      setAction(null);
      setRejectReason("");
      await loadProduct();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được sản phẩm.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} cards={2} />;
  }

  if (!product) {
    return (
      <EmptyState
        title="Không tìm thấy sản phẩm"
        description={error || "Sản phẩm này không còn nằm trong danh sách chờ duyệt hoặc backend không trả về bản ghi."}
        actionLabel="Quay lại danh sách sản phẩm chờ duyệt"
        onAction={() => window.history.back()}
      />
    );
  }

  const gallery = product.gallery?.length ? product.gallery : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chi tiết sản phẩm"
        title={product.name}
        description={product.description}
        action={
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => setAction("reject")}>
              Từ chối sản phẩm
            </Button>
            <Button onClick={() => setAction("approve")}>Duyệt sản phẩm</Button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DetailPanel eyebrow="Dữ liệu thương mại" title="Giá bán và hoa hồng">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="Seller" value={product.sellerName} />
            <InfoItem label="Trạng thái review" value={product.reviewSummary} />
            <InfoItem label="Danh mục sản phẩm" value={product.productCategory} />
            <InfoItem label="Giá" value={product.price ? product.price.toLocaleString("vi-VN") : "--"} />
            <InfoItem label="Hoa hồng" value={product.commissionRate || "--"} />
            <InfoItem label="Tồn kho" value={product.stock === null ? "--" : String(product.stock)} />
            <InfoItem label="Ngày gửi" value={formatDateTime(product.submittedAt)} />
            <InfoItem label="Rủi ro" value={product.riskLevel} />
          </div>
        </DetailPanel>
        <DetailPanel eyebrow="Trạng thái duyệt" title="Một quyết định review">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <StatusBadge status={product.reviewStatus} />
              <p className="text-sm text-slate-300">{product.reviewSummary}</p>
            </div>
            <div className="space-y-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                Review catalog: {product.catalogReview.available ? "Đang chờ duyệt" : product.catalogReview.status}
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                Review affiliate: {product.affiliateReview.available ? "Đang chờ duyệt" : product.affiliateReview.status}
              </div>
            </div>
          </div>
        </DetailPanel>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DetailPanel eyebrow="Media sản phẩm" title="Bộ ảnh và nội dung">
          {gallery.length ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
                <img src={selectedImage || gallery[0]} alt={product.name} className="h-80 w-full object-cover" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {gallery.map((image) => (
                  <button key={image} type="button" onClick={() => setSelectedImage(image)} className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.03] text-left">
                    <img src={image} alt={product.name} className="h-28 w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              Sản phẩm này chưa có ảnh để admin review.
            </div>
          )}
          <div className="mt-4 rounded-[1.5rem] bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
            {product.description}
          </div>
        </DetailPanel>
        <DetailPanel eyebrow="Biến thể" title="Biến thể và tồn kho">
          {product.variants?.length ? (
            <div className="space-y-3">
              {product.variants.map((variant) => (
                <div key={variant.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">{variant.name}</p>
                  <p className="mt-2">SKU: {variant.sku}</p>
                  <p>Giá: {variant.price.toLocaleString("vi-VN")}</p>
                  <p>Tồn kho: {variant.quantity}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              Chưa có biến thể trong hồ sơ sản phẩm.
            </div>
          )}
        </DetailPanel>
      </div>
      <DetailPanel
        eyebrow="Ghi chú kiểm duyệt"
        title="Bối cảnh rủi ro và phê duyệt"
        footer={
          <Link to="/admin/products/pending">
            <Button variant="secondary">Quay lại danh sách sản phẩm chờ duyệt</Button>
          </Link>
        }
      >
        <div className="rounded-[1.5rem] bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
          Admin chỉ cần đưa ra một quyết định duy nhất cho sản phẩm này. Nếu sản phẩm đang có catalog pending và affiliate pending, hành động duyệt hoặc từ chối sẽ đồng bộ cả hai phần cùng một lý do review.
        </div>
      </DetailPanel>
      <ConfirmModal
        open={Boolean(action)}
        title={action === "approve" ? "Duyệt sản phẩm" : "Từ chối sản phẩm"}
        description={`Xác nhận ${action === "approve" ? "duyệt" : "từ chối"} cho ${product.name}. Nếu sản phẩm đang có catalog và affiliate pending, hệ thống sẽ cập nhật cả hai cùng một lúc.`}
        confirmVariant={action === "approve" ? "primary" : "danger"}
        onClose={() => {
          setAction(null);
          setRejectReason("");
        }}
        onConfirm={handleConfirmAction}
        loading={submitting}
      >
        {action === "reject" ? (
          <Input
            label="Lý do từ chối"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Nêu rõ vấn đề về chính sách hoặc chất lượng"
          />
        ) : null}
      </ConfirmModal>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}

export default AdminProductDetailPage;
