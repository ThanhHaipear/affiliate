import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCustomerOrderDetail, getCustomerOrders } from "../../../api/orderApi";
import { createProductReview } from "../../../api/productApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import Modal from "../../../components/common/Modal";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import OrderStatusTimeline from "../../../components/order/OrderStatusTimeline";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { aggregateOrderItemsForDisplay, mapOrderDto } from "../../../lib/apiMappers";

function OrderDetailPage() {
  const toast = useToast();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");
        const [orderResponse, ordersResponse] = await Promise.all([getCustomerOrderDetail(orderId), getCustomerOrders()]);
        if (!active) {
          return;
        }

        setOrder({ ...mapOrderDto(orderResponse), raw: orderResponse });
        setAllOrders((ordersResponse || []).map(mapOrderDto));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được chi tiết đơn hàng.");
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

  const groupedOrders = useMemo(
    () => allOrders.filter((item) => String(item.code) === String(order?.code || "")),
    [allOrders, order?.code],
  );
  const items = order?.raw?.items || [];
  const displayItems = useMemo(() => aggregateOrderItemsForDisplay(items), [items]);
  const payment = order?.raw?.payments?.[0] || null;
  const latestRefundRequest = order?.raw?.refunds?.[0] || null;
  const groupedTotalAmount = groupedOrders.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (loading) {
    return <EmptyState title="Đang tải chi tiết đơn" description="Hệ thống đang đọc đơn hàng từ database." />;
  }

  if (error || !order) {
    return <EmptyState title="Không tìm thấy đơn hàng" description={error || "Đơn hàng không tồn tại."} />;
  }

  function openReviewModal(item) {
    setReviewItem(item);
    setReviewModalOpen(true);
    setReviewComment("");
    setReviewRating("5");
    setReviewEligibility({
      hasPurchased: true,
      hasReviewed: Boolean(item?.hasReviewed),
      canReview: !item?.hasReviewed,
      reason: item?.hasReviewed ? "Sản phẩm này trong đơn đã được đánh giá rồi." : null,
    });
  }

  function closeReviewModal() {
    setReviewModalOpen(false);
    setReviewItem(null);
    setReviewEligibility(null);
    setReviewComment("");
    setReviewRating("5");
  }

  async function handleSubmitReview() {
    if (!reviewItem?.productId || !reviewItem?.reviewOrderItemId) {
      return;
    }

    try {
      setReviewSubmitting(true);
      await createProductReview(reviewItem.productId, {
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
        orderItemId: reviewItem.reviewOrderItemId,
      });
      setOrder((current) => ({
        ...current,
        raw: {
          ...current.raw,
          items: (current.raw?.items || []).map((item) =>
            String(item.productId) === String(reviewItem.productId)
              ? { ...item, productReview: { id: `temp-${reviewItem.productId}` } }
              : item,
          ),
        },
      }));
      setReviewEligibility({
        hasPurchased: true,
        hasReviewed: true,
        canReview: false,
        reason: "Sản phẩm này trong đơn đã được đánh giá rồi.",
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
        eyebrow="Khách hàng"
        title={`Chi tiết đơn ${order.code}`}

        action={
          <div className="flex gap-3">
            <Link to="/products">
              <Button variant="secondary">Mua lại</Button>
            </Link>
            <Button variant="outline">Liên hệ hỗ trợ</Button>
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
              <InfoRow label="Mã cụm checkout" value={order.code} />
              <InfoRow
                label="Tổng tiền cả cụm"
                value={<MoneyText value={groupedTotalAmount} className="font-semibold text-slate-900" />}
              />
              <InfoRow label="Ngày đặt" value={formatDateTime(order.created_at)} />
              <InfoRow
                label="Tổng thanh toán"
                value={<MoneyText value={order.amount} className="font-semibold text-slate-900" />}
              />
              <InfoRow label="Người nhận" value={order.raw?.shippingRecipientName || order.raw?.buyerName || "--"} />
              <InfoRow label="Số điện thoại" value={order.raw?.shippingPhone || order.raw?.buyerPhone || "--"} />
              <InfoRow label="Email" value={order.raw?.buyerEmail || "--"} />
              <InfoRow label="Phương thức thanh toán" value={payment?.method || "--"} />
              <InfoRow label="Phương thức giao hàng" value={order.raw?.shippingMethod || "--"} />
              <InfoRow
                label="Địa chỉ giao hàng"
                value={
                  [
                    order.raw?.shippingDetail,
                    order.raw?.shippingWard,
                    order.raw?.shippingDistrict,
                    order.raw?.shippingProvince,
                  ]
                    .filter(Boolean)
                    .join(", ") || "--"
                }
              />
            </div>
          </div>
          {latestRefundRequest ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Yêu cầu hủy/hoàn tiền</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Trạng thái: <span className="font-semibold text-slate-900">{latestRefundRequest.status}</span>
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">Lý do: {latestRefundRequest.reason || "--"}</p>
            </div>
          ) : null}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Các seller-order trong cụm</h3>
            <div className="mt-5 space-y-3">
              {groupedOrders.map((item) => (
                <div key={item.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.raw?.seller?.shopName || `Shop #${item.seller_id || item.id}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">Seller-order #{item.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={item.order_status} />
                      <StatusBadge status={item.payment_status} />
                      <Link to={`/dashboard/customer/orders/${item.id}`}>
                        <Button size="sm" variant={String(item.id) === String(order.id) ? "primary" : "secondary"}>
                          {String(item.id) === String(order.id) ? "Đang xem" : "Mở seller-order"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Sản phẩm trong đơn</h3>
            <div className="mt-5 space-y-4">
              {displayItems.map((item) => (
                <div key={item.groupKey} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.productName}</p>
                      <p className="mt-1 text-sm text-slate-500">Số lượng: {item.quantity}</p>
                      {item.variantLabel ? <p className="mt-1 text-sm text-slate-500">Phân loại: {item.variantLabel}</p> : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <MoneyText value={item.lineTotal || 0} className="font-semibold text-slate-900" />
                      {order.order_status === "COMPLETED" ? (
                        <Button size="sm" onClick={() => openReviewModal(item)}>
                          {item.hasReviewed ? "Đã đánh giá" : "Đánh giá"}
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
            <h3 className="text-xl font-semibold text-slate-900">Ghi chú giao hàng</h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Đơn hàng đã lưu snapshot địa chỉ giao hàng tại thời điểm đặt mua, nên bạn vẫn xem lại được ngay cả khi thay đổi sổ địa chỉ sau này.
            </p>
          </div>
        </div>
      </div>
      <Modal
        open={reviewModalOpen}
        title={reviewItem ? `Đánh giá ${reviewItem.productName || `Sản phẩm #${reviewItem.productId}`}` : "Đánh giá sản phẩm"}
        description="Mỗi sản phẩm trong một đơn hoàn tất chỉ được đánh giá một lần."
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
        {reviewEligibility?.canReview ? (
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
