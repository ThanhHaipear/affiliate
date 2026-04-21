import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelCustomerOrder,
  changeOrderPaymentMethod,
  createVnpayPaymentUrl,
  getCustomerOrders,
  refundCustomerOrder,
} from "../../../api/orderApi";
import { createProductReview } from "../../../api/productApi";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import EmptyState from "../../../components/common/EmptyState";
import Modal from "../../../components/common/Modal";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapOrderDto } from "../../../lib/apiMappers";

const DELIVERED_ORDER_STATUSES = ["COMPLETED"];
const FAILED_ORDER_STATUSES = ["REFUNDED", "CANCELLED"];
const ORDER_GROUPS_PER_PAGE = 8;

function isDeliveredOrder(order) {
  return DELIVERED_ORDER_STATUSES.includes(order.order_status);
}

function isFailedOrder(order) {
  return FAILED_ORDER_STATUSES.includes(order.order_status);
}

function isProcessingOrder(order) {
  return !isDeliveredOrder(order) && !isFailedOrder(order);
}

function groupOrdersByCode(orders = []) {
  const groups = new Map();

  orders.forEach((order) => {
    const orderCode = order.code || `#${order.id}`;
    const existing = groups.get(orderCode);

    if (!existing) {
      groups.set(orderCode, {
        orderCode,
        createdAt: order.created_at || null,
        totalAmount: Number(order.amount || 0),
        sellerCount: 1,
        orders: [order],
      });
      return;
    }

    existing.totalAmount += Number(order.amount || 0);
    existing.orders.push(order);

    const existingDate = new Date(existing.createdAt || 0).getTime();
    const candidateDate = new Date(order.created_at || 0).getTime();
    if (candidateDate > existingDate) {
      existing.createdAt = order.created_at;
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      sellerCount: group.orders.length,
      completedCount: group.orders.filter(isDeliveredOrder).length,
      failedCount: group.orders.filter(isFailedOrder).length,
      processingCount: group.orders.filter(isProcessingOrder).length,
      orders: [...group.orders].sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)),
    }))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

function getGroupActions(group) {
  const payments = (group.orders || []).map((order) => order.raw?.payments?.[0] || null);
  const hasPendingRefundRequest = (group.orders || []).some((order) => order.raw?.refunds?.[0]?.status === "PENDING");

  const canPayWithVnpay =
    group.orders.length > 0 &&
    group.orders.every(
      (order, index) =>
        order.order_status === "PENDING_PAYMENT" &&
        ["VNPAY", "CARD"].includes(payments[index]?.method) &&
        payments[index]?.status === "PENDING",
    );

  const canSwitchToCod =
    group.orders.length > 0 &&
    group.orders.every((order, index) => order.order_status === "PENDING_PAYMENT" && payments[index]?.status === "PENDING") &&
    payments.some((payment) => ["VNPAY", "CARD"].includes(payment?.method));

  const canDirectCancel =
    group.orders.length > 0 &&
    group.orders.every(
      (order, index) =>
        order.order_status === "PENDING_PAYMENT" &&
        payments[index]?.status === "PENDING" &&
        payments[index]?.method === "COD",
    );

  const canRequestRefundCancel =
    group.orders.length > 0 &&
    group.orders.every(
      (order, index) =>
        order.order_status === "PAID" &&
        ["VNPAY", "CARD"].includes(payments[index]?.method) &&
        payments[index]?.status === "PAID" &&
        !order.raw?.sellerConfirmedReceivedMoney,
    ) &&
    !hasPendingRefundRequest;

  return {
    canPayWithVnpay,
    canSwitchToCod,
    canCancelGroup: canDirectCancel || canRequestRefundCancel,
    canRequestRefundCancel,
  };
}

function getSellerOrderActions(order) {
  const payment = order.raw?.payments?.[0] || null;
  const hasPendingRefundRequest = order.raw?.refunds?.some((refund) => refund.status === "PENDING");

  const canCancelOrder =
    order.order_status === "PENDING_PAYMENT" &&
    payment?.method === "COD" &&
    payment?.status === "PENDING";

  const canRefundOrder =
    order.order_status === "PAID" &&
    ["VNPAY", "CARD"].includes(payment?.method) &&
    payment?.status === "PAID" &&
    !order.raw?.sellerConfirmedReceivedMoney &&
    !hasPendingRefundRequest;

  return {
    canCancelOrder,
    canRefundOrder,
    hasPendingRefundRequest,
  };
}

function MyOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [selectedOrderItemId, setSelectedOrderItemId] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [page, setPage] = useState(1);
  const [payingGroupCode, setPayingGroupCode] = useState("");
  const [switchingGroupCode, setSwitchingGroupCode] = useState("");
  const [cancellingGroupCode, setCancellingGroupCode] = useState("");
  const [cancelGroup, setCancelGroup] = useState(null);
  const [actingOrderId, setActingOrderId] = useState("");
  const [actionOrder, setActionOrder] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");
        const response = await getCustomerOrders();
        if (!active) {
          return;
        }

        setOrders((response || []).map(mapOrderDto));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được lịch sử đơn hàng.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, []);

  const groupedOrders = useMemo(() => groupOrdersByCode(orders), [orders]);
  const totalPages = Math.max(1, Math.ceil(groupedOrders.length / ORDER_GROUPS_PER_PAGE));
  const paginatedGroupedOrders = useMemo(() => {
    const startIndex = (page - 1) * ORDER_GROUPS_PER_PAGE;
    return groupedOrders.slice(startIndex, startIndex + ORDER_GROUPS_PER_PAGE);
  }, [groupedOrders, page]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(groupedOrders.length / ORDER_GROUPS_PER_PAGE))));
  }, [groupedOrders]);

  const summary = useMemo(
    () => [
      { label: "Tổng cụm đơn", value: `${groupedOrders.length}` },
      { label: "Seller-order hoàn tất", value: `${orders.filter(isDeliveredOrder).length}` },
      { label: "Seller-order đang xử lý", value: `${orders.filter(isProcessingOrder).length}` },
      { label: "Seller-order hoàn tiền/hủy", value: `${orders.filter(isFailedOrder).length}` },
    ],
    [groupedOrders, orders],
  );

  const reviewItems = useMemo(
    () => (reviewOrder?.raw?.items || []).filter((item) => item.productId),
    [reviewOrder],
  );

  const selectedItem = reviewItems.find((item) => String(item.id) === String(selectedOrderItemId));
  const selectedEligibility = selectedItem
    ? {
      hasPurchased: true,
      hasReviewed: Boolean(selectedItem.productReview),
      canReview: !selectedItem.productReview,
      reason: selectedItem.productReview ? "Lần mua này đã được đánh giá rồi." : null,
    }
    : null;

  function openReviewModal(order) {
    const orderItems = (order?.raw?.items || []).filter((item) => item.productId);
    setReviewOrder(order);
    setReviewModalOpen(true);
    setSelectedOrderItemId(String(orderItems.find((item) => !item.productReview)?.id || orderItems[0]?.id || ""));
    setReviewComment("");
    setReviewRating("5");
  }

  function closeReviewModal() {
    setReviewModalOpen(false);
    setReviewOrder(null);
    setSelectedOrderItemId("");
    setReviewComment("");
    setReviewRating("5");
  }

  async function handleSubmitReview() {
    if (!selectedItem?.productId) {
      return;
    }

    try {
      setReviewSubmitting(true);
      await createProductReview(selectedItem.productId, {
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
        orderItemId: selectedItem.id,
      });

      setReviewOrder((current) => ({
        ...current,
        raw: {
          ...current.raw,
          items: (current.raw?.items || []).map((item) =>
            String(item.id) === String(selectedItem.id)
              ? { ...item, productReview: { id: `temp-${selectedItem.id}` } }
              : item,
          ),
        },
      }));
      setReviewComment("");
      setReviewRating("5");
      toast.success("Đã gửi đánh giá sản phẩm.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không gửi được đánh giá.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function reloadOrders() {
    const response = await getCustomerOrders();
    setOrders((response || []).map(mapOrderDto));
  }

  async function handlePayGroupWithVnpay(group) {
    try {
      setPayingGroupCode(group.orderCode);
      const primaryOrder = group.orders?.[0];
      const response = await createVnpayPaymentUrl(primaryOrder.id, {});
      window.location.href = response.paymentUrl;
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không tạo được phiên thanh toán VNPAY cho cụm đơn.");
    } finally {
      setPayingGroupCode("");
    }
  }

  async function handleSwitchGroupToCod(group) {
    try {
      setSwitchingGroupCode(group.orderCode);
      const primaryOrder = group.orders?.[0];
      await changeOrderPaymentMethod(primaryOrder.id, { paymentMethod: "COD" });
      await reloadOrders();
      toast.success("Đã chuyển phương thức thanh toán sang COD cho toàn bộ cụm đơn.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không đổi được phương thức thanh toán của cụm đơn.");
    } finally {
      setSwitchingGroupCode("");
    }
  }

  async function handleCancelGroup() {
    if (!cancelGroup) {
      return;
    }

    const { canRequestRefundCancel } = getGroupActions(cancelGroup);

    try {
      setCancellingGroupCode(cancelGroup.orderCode);
      const primaryOrder = cancelGroup.orders?.[0];
      await cancelCustomerOrder(primaryOrder.id, {
        reason: canRequestRefundCancel
          ? "Customer requested cancellation after VNPAY payment"
          : "Customer cancelled unpaid order group",
      });
      await reloadOrders();
      setCancelGroup(null);
      toast.success(
        canRequestRefundCancel
          ? "Đã gửi yêu cầu hoàn tiền cho toàn bộ cụm đơn."
          : "Đã hủy toàn bộ cụm đơn chưa thanh toán.",
      );
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không xử lý được cụm đơn.");
    } finally {
      setCancellingGroupCode("");
    }
  }

  async function handleSellerOrderAction() {
    if (!actionOrder) {
      return;
    }

    const { canRefundOrder } = getSellerOrderActions(actionOrder);

    try {
      setActingOrderId(String(actionOrder.id));
      await refundCustomerOrder(actionOrder.id, {
        reason: canRefundOrder
          ? "Customer requested refund for this seller order after VNPAY payment"
          : "Customer cancelled this unpaid COD seller order",
      });
      await reloadOrders();
      setActionOrder(null);
      toast.success(
        canRefundOrder
          ? "Đã gửi yêu cầu hoàn tiền cho seller-order này."
          : "Đã hủy seller-order COD chưa thanh toán.",
      );
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không xử lý được seller-order này.");
    } finally {
      setActingOrderId("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khách hàng"
        title="Đơn hàng của tôi"

      />
      {loading ? <EmptyState title="Đang tải đơn hàng" description="Hệ thống đang lấy danh sách đơn hàng từ backend." /> : null}
      {!loading && error ? <EmptyState title="Không tải được đơn hàng" description={error} /> : null}
      {!loading && !error ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary.map((item) => (
              <div key={item.label} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-700">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          {groupedOrders.length ? (
            <div className="space-y-5">
              {paginatedGroupedOrders.map((group) => {
                const actions = getGroupActions(group);

                return (
                  <section key={group.orderCode} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-cyan-700">Cụm checkout</p>
                        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{group.orderCode}</h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                            {group.sellerCount} seller
                          </span>
                          {group.completedCount ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
                              {group.completedCount} đã hoàn tất
                            </span>
                          ) : null}
                          {group.processingCount ? (
                            <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm text-cyan-800">
                              {group.processingCount} đang xử lý
                            </span>
                          ) : null}
                          {group.failedCount ? (
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-800">
                              {group.failedCount} hủy/hoàn tiền
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[22rem]">
                        <div className="rounded-[1.25rem] bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ngày tạo cụm</p>
                          <p className="mt-2 font-medium text-slate-900">{formatDateTime(group.createdAt)}</p>
                        </div>
                        <div className="rounded-[1.25rem] bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tổng tiền cả cụm</p>
                          <p className="mt-2 font-medium text-slate-900">
                            <MoneyText value={group.totalAmount} />
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {actions.canPayWithVnpay ? (
                        <Button loading={payingGroupCode === group.orderCode} onClick={() => handlePayGroupWithVnpay(group)}>
                          Thanh toán cả cụm qua VNPAY
                        </Button>
                      ) : null}
                      {actions.canSwitchToCod ? (
                        <Button
                          variant="secondary"
                          loading={switchingGroupCode === group.orderCode}
                          onClick={() => handleSwitchGroupToCod(group)}
                        >
                          Chuyển cả cụm sang COD
                        </Button>
                      ) : null}
                      {actions.canCancelGroup ? (
                        <Button variant="danger" onClick={() => setCancelGroup(group)}>
                          {actions.canRequestRefundCancel ? "Hoàn tiền cả cụm đơn" : "Hủy cả cụm đơn"}
                        </Button>
                      ) : null}
                      <Link to="/products">
                        <Button variant="secondary">Mua lại</Button>
                      </Link>
                      <Button variant="outline">Liên hệ hỗ trợ</Button>
                    </div>

                    <div className="mt-5 space-y-4">
                      {group.orders.map((order) => {
                        const sellerActions = getSellerOrderActions(order);

                        return (
                          <article key={order.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Seller</p>
                                  <p className="mt-1 text-lg font-semibold text-slate-900">{order.seller_name}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <StatusBadge status={order.order_status} />
                                  <StatusBadge status={order.payment_status} />
                                </div>
                              </div>

                              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3 xl:min-w-[34rem]">
                                <div className="rounded-[1rem] bg-white p-3">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mã seller-order</p>
                                  <p className="mt-2 font-medium text-slate-900">#{order.id}</p>
                                </div>
                                <div className="rounded-[1rem] bg-white p-3">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ngày tạo</p>
                                  <p className="mt-2 font-medium text-slate-900">{formatDateTime(order.created_at)}</p>
                                </div>
                                <div className="rounded-[1rem] bg-white p-3">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tổng tiền seller</p>
                                  <p className="mt-2 font-medium text-slate-900">
                                    <MoneyText value={order.amount} />
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Link to={`/dashboard/customer/orders/${order.id}`}>
                                <Button variant="secondary" size="sm">
                                  Xem chi tiết seller-order
                                </Button>
                              </Link>
                              {sellerActions.canCancelOrder ? (
                                <Button size="sm" variant="danger" onClick={() => setActionOrder(order)}>
                                  Hủy seller-order này
                                </Button>
                              ) : null}
                              {sellerActions.canRefundOrder ? (
                                <Button size="sm" variant="danger" onClick={() => setActionOrder(order)}>
                                  Hoàn tiền seller-order này
                                </Button>
                              ) : null}
                              {isDeliveredOrder(order) ? (
                                <Button size="sm" onClick={() => openReviewModal(order)}>
                                  Đánh giá sản phẩm của seller này
                                </Button>
                              ) : null}
                            </div>
                            {sellerActions.hasPendingRefundRequest ? (
                              <p className="mt-3 text-sm text-orange-700">
                                Seller-order này đang có yêu cầu hoàn tiền chờ admin duyệt.
                              </p>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              {groupedOrders.length > ORDER_GROUPS_PER_PAGE ? (
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="Chưa có đơn hàng"
              description="Khi bạn đặt hàng, hệ thống sẽ nhóm các seller-order cùng một lần checkout vào đây theo mã đơn."
            />
          )}

          <ReviewOrderModal
            open={reviewModalOpen}
            order={reviewOrder}
            items={reviewItems}
            loading={false}
            selectedOrderItemId={selectedOrderItemId}
            reviewRating={reviewRating}
            reviewComment={reviewComment}
            reviewSubmitting={reviewSubmitting}
            selectedEligibility={selectedEligibility}
            onClose={closeReviewModal}
            onOrderItemChange={setSelectedOrderItemId}
            onRatingChange={setReviewRating}
            onCommentChange={setReviewComment}
            onSubmit={handleSubmitReview}
          />
          <ConfirmModal
            open={Boolean(cancelGroup)}
            title={cancelGroup && getGroupActions(cancelGroup).canRequestRefundCancel ? "Hoàn tiền cụm đơn" : "Hủy cụm đơn"}
            description={
              cancelGroup
                ? getGroupActions(cancelGroup).canRequestRefundCancel
                  ? "Cụm đơn này đã được thanh toán online. Hệ thống sẽ gửi yêu cầu hoàn tiền cho toàn bộ cụm đơn để admin duyệt."
                  : "Cụm đơn COD này đang chờ thanh toán. Nếu hủy, hệ thống sẽ đóng toàn bộ cụm đơn."
                : ""
            }
            confirmLabel={cancelGroup && getGroupActions(cancelGroup).canRequestRefundCancel ? "Xác nhận hoàn tiền" : "Xác nhận hủy"}
            confirmVariant="danger"
            loading={Boolean(cancelGroup) && cancellingGroupCode === cancelGroup.orderCode}
            onClose={() => setCancelGroup(null)}
            onConfirm={handleCancelGroup}
          />
          <ConfirmModal
            open={Boolean(actionOrder)}
            title={actionOrder && getSellerOrderActions(actionOrder).canRefundOrder ? "Hoàn tiền seller-order" : "Hủy seller-order"}
            description={
              actionOrder
                ? getSellerOrderActions(actionOrder).canRefundOrder
                  ? "Seller-order này đã được thanh toán online. Hệ thống sẽ gửi yêu cầu hoàn tiền cho phần đơn của seller này để admin duyệt."
                  : "Seller-order COD này đang chờ thanh toán. Nếu hủy, hệ thống sẽ đóng riêng phần đơn của seller này."
                : ""
            }
            confirmLabel={actionOrder && getSellerOrderActions(actionOrder).canRefundOrder ? "Xác nhận hoàn tiền" : "Xác nhận hủy"}
            confirmVariant="danger"
            loading={Boolean(actionOrder) && actingOrderId === String(actionOrder.id)}
            onClose={() => setActionOrder(null)}
            onConfirm={handleSellerOrderAction}
          />
        </>
      ) : null}
    </div>
  );
}

function ReviewOrderModal({
  open,
  order,
  items,
  loading,
  selectedOrderItemId,
  reviewRating,
  reviewComment,
  reviewSubmitting,
  selectedEligibility,
  onClose,
  onOrderItemChange,
  onRatingChange,
  onCommentChange,
  onSubmit,
}) {
  const selectedItem = items.find((item) => String(item.id) === String(selectedOrderItemId));

  return (
    <Modal
      open={open}
      title={order ? `Đánh giá seller-order ${order.code} / #${order.id}` : "Đánh giá sản phẩm"}
      description="Mỗi lần mua hợp lệ trong đơn hoàn tất được đánh giá một lần."
      onClose={onClose}
      footer={
        selectedEligibility?.canReview ? (
          <div className="flex justify-end">
            <Button onClick={onSubmit} loading={reviewSubmitting}>
              Gửi đánh giá
            </Button>
          </div>
        ) : null
      }
    >
      {loading ? (
        <p className="text-sm leading-7 text-slate-300">Đang kiểm tra điều kiện đánh giá cho các sản phẩm trong đơn.</p>
      ) : items.length ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Chọn lần mua</p>
            <select
              value={selectedOrderItemId}
              onChange={(event) => onOrderItemChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {(item.productNameSnapshot || `Sản phẩm #${item.productId}`)} - lần mua #{item.id} -{" "}
                  {item.productReview ? "Đã đánh giá" : "Có thể đánh giá"}
                </option>
              ))}
            </select>
          </div>
          {selectedItem ? (
            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm font-medium text-white">{selectedItem.productNameSnapshot || `Sản phẩm #${selectedItem.productId}`}</p>
              <p className="mt-2 text-sm text-slate-400">Số lượng: {selectedItem.quantity}</p>
            </div>
          ) : null}
          {selectedEligibility?.canReview ? (
            <div className="space-y-3">
              <select
                value={reviewRating}
                onChange={(event) => onRatingChange(event.target.value)}
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
                onChange={(event) => onCommentChange(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                placeholder="Chia sẻ cảm nhận của bạn về sản phẩm"
              />
            </div>
          ) : (
            <div className="rounded-[1.5rem] bg-slate-800/80 p-4 text-sm leading-7 text-slate-300">
              {selectedEligibility?.reason || "Sản phẩm này hiện chưa thể đánh giá."}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm leading-7 text-slate-300">Đơn này chưa có sản phẩm hợp lệ để đánh giá.</p>
      )}
    </Modal>
  );
}

export default MyOrdersPage;
