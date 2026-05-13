import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  approveAffiliateSetting,
  approveProduct,
  getAdminProductDetail,
  rejectAffiliateSetting,
  rejectProduct,
  setAdminProductVisibility,
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
import { mapProductDto } from "../../lib/apiMappers";
import { formatDateTime } from "../../lib/format";

function buildReviewSummary(product) {
  const catalogPending = product?.raw?.status === "PENDING";
  const affiliatePending = product?.raw?.affiliateSetting?.approvalStatus === "PENDING";

  if (catalogPending && affiliatePending) {
    return "Đang chờ duyệt catalog và affiliate";
  }

  if (catalogPending) {
    return "Đang chờ duyệt catalog";
  }

  if (affiliatePending) {
    return "Đang chờ duyệt affiliate";
  }

  return "Không có review pending";
}

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
    try {
      setLoading(true);
      setError("");
      const response = await getAdminProductDetail(id);
      const mapped = mapProductDto(response);
      setProduct(mapped);
      setSelectedImage(mapped.gallery?.[0] || mapped.image);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được chi tiết sản phẩm.");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAction() {
    if (!product) {
      return;
    }

    const catalogPending = product.raw?.status === "PENDING";
    const affiliatePending = product.raw?.affiliateSetting?.approvalStatus === "PENDING";
    const canManageVisibility = product.raw?.status === "APPROVED";

    try {
      setSubmitting(true);

      if (action === "approve") {
        if (catalogPending) {
          await approveProduct(product.id);
        } else if (affiliatePending) {
          await approveAffiliateSetting(product.raw.affiliateSetting.id);
        }
      }

      if (action === "reject") {
        if (catalogPending) {
          await rejectProduct(product.id, { rejectReason });
        } else if (affiliatePending) {
          await rejectAffiliateSetting(product.raw.affiliateSetting.id, { rejectReason });
        }
      }

      if ((action === "hide" || action === "show") && canManageVisibility) {
        await setAdminProductVisibility(product.id, {
          visible: action === "show",
          reason: action === "hide" ? rejectReason : undefined,
        });
      }

      toast.success(
        action === "approve"
          ? "Đã duyệt sản phẩm."
          : action === "reject"
            ? "Đã từ chối sản phẩm."
            : action === "hide"
              ? "Đã ẩn sản phẩm."
              : "Đã mở hiển thị sản phẩm.",
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
        description={error || "Sản phẩm không tồn tại hoặc backend không trả về bản ghi."}
        actionLabel="Quay lại"
        onAction={() => window.history.back()}
      />
    );
  }

  const gallery = product.gallery?.length ? product.gallery : [];
  const catalogPending = product.raw?.status === "PENDING";
  const affiliatePending = product.raw?.affiliateSetting?.approvalStatus === "PENDING";
  const canReview = catalogPending || affiliatePending;
  const canManageVisibility = product.raw?.status === "APPROVED";
  const reviewSummary = buildReviewSummary(product);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chi tiết sản phẩm"
        title={product.name}
        description={product.description}
        action={
          <div className="flex flex-wrap gap-3">
            {canManageVisibility ? (
              <Button
                variant={product.admin_hidden ? "secondary" : "danger"}
                onClick={() => setAction(product.admin_hidden ? "show" : "hide")}
              >
                {product.admin_hidden ? "Hiện sản phẩm" : "Ẩn sản phẩm"}
              </Button>
            ) : null}
            {canReview ? (
              <>
                <Button variant="danger" onClick={() => setAction("reject")}>
                  Từ chối sản phẩm
                </Button>
                <Button onClick={() => setAction("approve")}>Duyệt sản phẩm</Button>
              </>
            ) : null}
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DetailPanel eyebrow="Dữ liệu thương mại" title="Giá bán và hoa hồng">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="Seller" value={product.seller_name} />
            <InfoItem label="Trạng thái review" value={reviewSummary} />
            <InfoItem label="Danh mục sản phẩm" value={product.category} />
            <InfoItem label="Giá" value={product.price ? product.price.toLocaleString("vi-VN") : "--"} />
            <InfoItem label="Hoa hồng" value={`${Number(product.commission_value || 0)}%`} />
            <InfoItem label="Tồn kho" value={product.stock === null ? "--" : String(product.stock)} />
            <InfoItem label="Ngày cập nhật" value={formatDateTime(product.raw?.updatedAt || product.raw?.createdAt)} />
            <InfoItem label="Hiển thị" value={product.visibility_status} />
          </div>
        </DetailPanel>
        <DetailPanel eyebrow="Trạng thái duyệt" title="Tổng hợp trạng thái">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <StatusBadge status={product.approval_status} />
              <StatusBadge status={product.affiliate_setting_status} />
              <StatusBadge status={product.visibility_status} />
            </div>
            <div className="space-y-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                Review catalog: {catalogPending ? "Đang chờ duyệt" : product.approval_status}
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                Review affiliate: {affiliatePending ? "Đang chờ duyệt" : product.affiliate_setting_status}
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                Hiển thị seller: {product.seller_hidden ? "Seller đang ẩn" : "Seller đang mở"}
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                Hiển thị admin: {product.admin_hidden ? "Admin đang ẩn" : "Admin đang mở"}
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
                  <p className="mt-2">Giá: {variant.price.toLocaleString("vi-VN")}</p>
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
        eyebrow="Ghi chú quản trị"
        title="Quyền ưu tiên của admin"
        footer={
          <Link to="/admin/products/pending">
            <Button variant="secondary">Quay lại danh sách sản phẩm chờ duyệt</Button>
          </Link>
        }
      >
        <div className="rounded-[1.5rem] bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
          Admin là quyền cao nhất với sản phẩm. Nếu admin ẩn, seller không thể tự mở lại. Nếu seller đang ẩn sản phẩm, admin vẫn có thể mở hoặc ẩn tiếp sản phẩm đó.
        </div>
      </DetailPanel>
      <ConfirmModal
        open={Boolean(action)}
        title={
          action === "approve"
            ? "Duyệt sản phẩm"
            : action === "reject"
              ? "Từ chối sản phẩm"
              : action === "hide"
                ? "Ẩn sản phẩm"
                : "Hiện sản phẩm"
        }
        description={`Xác nhận thao tác cho ${product.name}.`}
        confirmVariant={action === "approve" || action === "show" ? "primary" : "danger"}
        disabled={(action === "reject" || action === "hide") && rejectReason.trim().length < 5}
        onClose={() => {
          setAction(null);
          setRejectReason("");
        }}
        onConfirm={handleConfirmAction}
        loading={submitting}
      >
        {action === "reject" || action === "hide" ? (
          <Input
            label={action === "reject" ? "Lý do từ chối (bắt buộc)" : "Lý do ẩn sản phẩm (bắt buộc)"}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder={action === "reject" ? "Nêu rõ vấn đề về chính sách hoặc chất lượng (tối thiểu 5 ký tự)" : "Lý do admin ẩn sản phẩm (tối thiểu 5 ký tự)"}
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
