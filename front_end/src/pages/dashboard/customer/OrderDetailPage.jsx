import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cancelCustomerOrder, createVnpayPaymentUrl, getCustomerOrderDetail } from "../../../api/orderApi";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import EmptyState from "../../../components/common/EmptyState";
import Modal from "../../../components/common/Modal";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { createProductReview, getProductReviews } from "../../../api/productApi";
import OrderStatusTimeline from "../../../components/order/OrderStatusTimeline";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapOrderDto } from "../../../lib/apiMappers";

function OrderDetailPage() {
  const toast = useToast();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");
        const response = await getCustomerOrderDetail(orderId);
        if (!active) {
          return;
        }

        setOrder({ ...mapOrderDto(response), raw: response });
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Khong tai duoc chi tiet don hang.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId]);

  async function reloadOrder() {
    const response = await getCustomerOrderDetail(orderId);
    setOrder({ ...mapOrderDto(response), raw: response });
  }

  if (loading) {
    return <EmptyState title="Dang tai chi tiet don" description="He thong dang doc don hang tu database." />;
  }

  if (error || !order) {
    return <EmptyState title="Khong tim thay don hang" description={error || "Don hang khong ton tai."} />;
  }

  const items = order.raw?.items || [];
  const payment = order.raw?.payments?.[0];
  const latestRefundRequest = order.raw?.refunds?.[0] || null;
  const hasPendingRefundRequest = latestRefundRequest?.status === "PENDING";
  const canDirectCancelOrder = order.order_status === "PENDING_PAYMENT" && payment?.method === "COD";
  const canRequestCancelOrder =
    order.order_status === "PAID" &&
    ["VNPAY", "CARD"].includes(payment?.method) &&
    !order.raw?.sellerConfirmedReceivedMoney &&
    !hasPendingRefundRequest;
  const canCancelOrder = canDirectCancelOrder || canRequestCancelOrder;
  const canPayWithVnpay = order.order_status === "PENDING_PAYMENT" && ["VNPAY", "CARD"].includes(payment?.method);

  async function handleCancelOrder() {
    try {
      setCancelling(true);
      await cancelCustomerOrder(orderId, {
        reason: canRequestCancelOrder
          ? "Customer requested cancellation after VNPAY payment"
          : "Customer cancelled unpaid order",
      });
      await reloadOrder();
      setCancelOpen(false);
      toast.success(canRequestCancelOrder ? "Da gui yeu cau huy don cho admin duyet." : "Da huy don hang.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong huy duoc don hang.");
    } finally {
      setCancelling(false);
    }
  }

  async function handlePayWithVnpay() {
    try {
      setCreatingPayment(true);
      const response = await createVnpayPaymentUrl(orderId, {});
      window.location.href = response.paymentUrl;
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong tao duoc phien thanh toan VNPAY.");
    } finally {
      setCreatingPayment(false);
    }
  }

  async function openReviewModal(item) {
    try {
      setReviewItem(item);
      setReviewModalOpen(true);
      setReviewComment("");
      setReviewRating("5");
      setReviewLoading(true);
      const response = await getProductReviews(item.productId);
      setReviewEligibility(response?.viewer || null);
    } catch (_error) {
      setReviewEligibility(null);
    } finally {
      setReviewLoading(false);
    }
  }

  function closeReviewModal() {
    setReviewModalOpen(false);
    setReviewItem(null);
    setReviewEligibility(null);
    setReviewComment("");
    setReviewRating("5");
  }

  async function handleSubmitReview() {
    if (!reviewItem?.productId) {
      return;
    }

    try {
      setReviewSubmitting(true);
      await createProductReview(reviewItem.productId, {
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      });
      setReviewEligibility({
        hasPurchased: true,
        hasReviewed: true,
        canReview: false,
        reason: "Bạn đã đánh giá sản phẩm này rồi.",
      });
      setReviewComment("");
      setReviewRating("5");
      toast.success("Đã gửi đánh giá sản phẩm.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không gửi được đánh giá.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khach hang"
        title={`Chi tiet don ${order.code}`}
        description="Xem thong tin nguoi nhan, san pham, thanh toan va timeline tien trinh don hang."
        action={
          <div className="flex gap-3">
            {canPayWithVnpay ? (
              <Button loading={creatingPayment} onClick={handlePayWithVnpay}>
                Thanh toan VNPAY
              </Button>
            ) : null}
            {canCancelOrder ? (
              <Button variant="danger" onClick={() => setCancelOpen(true)}>
                Huy don
              </Button>
            ) : null}
            <Link to="/products">
              <Button variant="secondary">Mua lai</Button>
            </Link>
            <Button variant="outline">Lien he ho tro</Button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={order.order_status} />
              <StatusBadge status={order.payment_status} />
              {latestRefundRequest ? <StatusBadge status={latestRefundRequest.status} /> : null}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoRow label="Ngay dat" value={formatDateTime(order.created_at)} />
              <InfoRow label="Tong thanh toan" value={<MoneyText value={order.amount} className="font-semibold text-slate-900" />} />
              <InfoRow label="Nguoi nhan" value={order.raw?.shippingRecipientName || order.raw?.buyerName || "--"} />
              <InfoRow label="So dien thoai" value={order.raw?.shippingPhone || order.raw?.buyerPhone || "--"} />
              <InfoRow label="Email" value={order.raw?.buyerEmail || "--"} />
              <InfoRow label="Phuong thuc thanh toan" value={payment?.method || "--"} />
              <InfoRow label="Phuong thuc giao hang" value={order.raw?.shippingMethod || "--"} />
              <InfoRow
                label="Dia chi giao hang"
                value={[
                  order.raw?.shippingDetail,
                  order.raw?.shippingWard,
                  order.raw?.shippingDistrict,
                  order.raw?.shippingProvince,
                ]
                  .filter(Boolean)
                  .join(", ") || "--"}
              />
            </div>
          </div>
          {latestRefundRequest ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Yeu cau huy/hoan tien</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Trang thai: <span className="font-semibold text-slate-900">{latestRefundRequest.status}</span>
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Ly do: {latestRefundRequest.reason || "--"}
              </p>
            </div>
          ) : null}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">San pham trong don</h3>
            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.productNameSnapshot || `San pham #${item.productId}`}</p>
                      <p className="mt-1 text-sm text-slate-500">So luong: {item.quantity}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <MoneyText value={item.lineTotal || item.unitPrice || 0} className="font-semibold text-slate-900" />
                      {order.order_status === "COMPLETED" ? (
                        <Button size="sm" onClick={() => openReviewModal(item)}>
                          Đánh giá
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <OrderStatusTimeline
            order={{
              ...order,
              updated_at: order.raw?.updatedAt || order.created_at,
            }}
          />
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Ghi chu giao hang</h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Don hang da luu snapshot dia chi giao hang tai thoi diem dat mua, nen ban van xem lai duoc ngay ca khi thay doi so dia chi sau nay.
            </p>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={cancelOpen}
        title="Huy don hang"
        description={
          canRequestCancelOrder
            ? "Don VNPAY da thanh toan. Neu huy, he thong se gui yeu cau hoan tien cho admin duyet truoc khi doi trang thai don."
            : "Don nay dang cho thanh toan. Neu huy, he thong se dong don va tra lai luong hang dang duoc giu cho."
        }
        confirmLabel="Xac nhan huy"
        confirmVariant="danger"
        loading={cancelling}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelOrder}
      />
      <Modal
        open={reviewModalOpen}
        title={reviewItem ? `Đánh giá ${reviewItem.productNameSnapshot || `Sản phẩm #${reviewItem.productId}`}` : "Đánh giá sản phẩm"}
        description="Chỉ sản phẩm trong đơn đã giao thành công và chưa được bạn đánh giá mới cho phép gửi review."
        onClose={closeReviewModal}
        footer={
          reviewEligibility?.canReview ? (
            <div className="flex justify-end">
              <Button onClick={handleSubmitReview} loading={reviewSubmitting}>
                Gửi đánh giá
              </Button>
            </div>
          ) : null
        }
      >
        {reviewLoading ? (
          <p className="text-sm leading-7 text-slate-300">Đang kiểm tra điều kiện đánh giá.</p>
        ) : reviewEligibility?.canReview ? (
          <div className="space-y-3">
            <select
              value={reviewRating}
              onChange={(event) => setReviewRating(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} sao
                </option>
              ))}
            </select>
            <textarea
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              placeholder="Chia sẻ cảm nhận của bạn về sản phẩm"
            />
          </div>
        ) : (
          <div className="rounded-[1.5rem] bg-slate-800/80 p-4 text-sm leading-7 text-slate-300">
            {reviewEligibility?.reason || "Sản phẩm này hiện chưa thể đánh giá."}
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="mt-2 text-sm leading-7 text-slate-700">{value}</div>
    </div>
  );
}

export default OrderDetailPage;
