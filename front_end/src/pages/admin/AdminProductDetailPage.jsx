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
      setError(loadError.response?.data?.message || "Khong tai duoc chi tiet san pham.");
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
      const requests = [];

      if (product.catalogReview.available) {
        requests.push(
          action === "approve"
            ? approveProduct(product.catalogReview.reviewEntityId)
            : rejectProduct(product.catalogReview.reviewEntityId, { rejectReason }),
        );
      }

      if (product.affiliateReview.available) {
        requests.push(
          action === "approve"
            ? approveAffiliateSetting(product.affiliateReview.reviewEntityId)
            : rejectAffiliateSetting(product.affiliateReview.reviewEntityId, { rejectReason }),
        );
      }

      await Promise.all(requests);
      toast.success(
        action === "approve"
          ? "Da duyet san pham va cac cau hinh lien quan."
          : "Da tu choi san pham va cac cau hinh lien quan.",
      );
      setAction(null);
      setRejectReason("");
      await loadProduct();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc san pham.");
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
        title="Product not found"
        description={error || "San pham nay khong con nam trong danh sach cho duyet hoac backend khong tra ve ban ghi."}
        actionLabel="Back to pending products"
        onAction={() => window.history.back()}
      />
    );
  }

  const gallery = product.gallery?.length ? product.gallery : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Product detail"
        title={product.name}
        description={product.description}
        action={
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => setAction("reject")}>
              Reject product
            </Button>
            <Button onClick={() => setAction("approve")}>Approve product</Button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DetailPanel eyebrow="Commercial data" title="Pricing and commission">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="Seller" value={product.sellerName} />
            <InfoItem label="Review status" value={product.reviewSummary} />
            <InfoItem label="Danh muc san pham" value={product.productCategory} />
            <InfoItem label="Price" value={product.price ? product.price.toLocaleString("vi-VN") : "--"} />
            <InfoItem label="Commission" value={product.commissionRate || "--"} />
            <InfoItem label="Stock" value={product.stock === null ? "--" : String(product.stock)} />
            <InfoItem label="Submitted" value={formatDateTime(product.submittedAt)} />
            <InfoItem label="Risk" value={product.riskLevel} />
          </div>
        </DetailPanel>
        <DetailPanel eyebrow="Approval status" title="One review decision">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <StatusBadge status={product.reviewStatus} />
              <p className="text-sm text-slate-300">{product.reviewSummary}</p>
            </div>
            <div className="space-y-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                Catalog review: {product.catalogReview.available ? "Dang cho duyet" : product.catalogReview.status}
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                Affiliate review: {product.affiliateReview.available ? "Dang cho duyet" : product.affiliateReview.status}
              </div>
            </div>
          </div>
        </DetailPanel>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DetailPanel eyebrow="Product media" title="Gallery and content">
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
              San pham nay chua co anh de admin review.
            </div>
          )}
          <div className="mt-4 rounded-[1.5rem] bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
            {product.description}
          </div>
        </DetailPanel>
        <DetailPanel eyebrow="Variants" title="Bien the va ton kho">
          {product.variants?.length ? (
            <div className="space-y-3">
              {product.variants.map((variant) => (
                <div key={variant.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">{variant.name}</p>
                  <p className="mt-2">SKU: {variant.sku}</p>
                  <p>Gia: {variant.price.toLocaleString("vi-VN")}</p>
                  <p>Ton kho: {variant.quantity}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              Chua co bien the trong ho so san pham.
            </div>
          )}
        </DetailPanel>
      </div>
      <DetailPanel
        eyebrow="Moderation note"
        title="Risk and approval context"
        footer={
          <Link to="/admin/products/pending">
            <Button variant="secondary">Back to pending products</Button>
          </Link>
        }
      >
        <div className="rounded-[1.5rem] bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
          Admin chi can dua ra mot quyet dinh duy nhat cho san pham nay. Neu san pham dang co catalog pending va affiliate pending, hanh dong approve hoac reject se dong bo ca hai phan cung mot ly do review.
        </div>
      </DetailPanel>
      <ConfirmModal
        open={Boolean(action)}
        title={action === "approve" ? "Approve product" : "Reject product"}
        description={`Xac nhan ${action || "review"} cho ${product.name}. Neu san pham dang co catalog va affiliate pending, he thong se cap nhat ca hai cung mot luc.`}
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
            label="Reject reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Explain policy or quality issue"
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
