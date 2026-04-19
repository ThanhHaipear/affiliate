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
    group.orders.every((order, index) =>
      order.order_status === "PENDING_PAYMENT" &&
      ["VNPAY", "CARD"].includes(payments[index]?.method) &&
      payments[index]?.status === "PENDING");

  const canSwitchToCod =
    group.orders.length > 0 &&
    group.orders.every((order, index) => order.order_status === "PENDING_PAYMENT" && payments[index]?.status === "PENDING") &&
    payments.some((payment) => ["VNPAY", "CARD"].includes(payment?.method));

  const canDirectCancel =
    group.orders.length > 0 &&
    group.orders.every((order, index) =>
      order.order_status === "PENDING_PAYMENT" &&
      payments[index]?.status === "PENDING" &&
      payments[index]?.method === "COD");

  const canRequestRefundCancel =
    group.orders.length > 0 &&
    group.orders.every((order, index) =>
      order.order_status === "PAID" &&
      ["VNPAY", "CARD"].includes(payments[index]?.method) &&
      payments[index]?.status === "PAID" &&
      !order.raw?.sellerConfirmedReceivedMoney) &&
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
          setError(loadError.response?.data?.message || "Khong tai duoc lich su don hang.");
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
      { label: "Tong cum don", value: `${groupedOrders.length}` },
      { label: "Seller-order hoan tat", value: `${orders.filter(isDeliveredOrder).length}` },
      { label: "Seller-order dang xu ly", value: `${orders.filter(isProcessingOrder).length}` },
      { label: "Seller-order hoan tien/huy", value: `${orders.filter(isFailedOrder).length}` },
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
        reason: selectedItem.productReview ? "Lan mua nay da duoc danh gia roi." : null,
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
      toast.success("Da gui danh gia san pham.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong gui duoc danh gia.");
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
      toast.error(submitError.response?.data?.message || "Khong tao duoc phien thanh toan VNPAY cho cum don.");
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
      toast.success("Da chuyen phuong thuc thanh toan sang COD cho toan bo cum don.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong doi duoc phuong thuc thanh toan cua cum don.");
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
          ? "Da gui yeu cau hoan tien cho toan bo cum don."
          : "Da huy toan bo cum don chua thanh toan.",
      );
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong xu ly duoc cum don.");
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
          ? "Da gui yeu cau hoan tien cho seller-order nay."
          : "Da huy seller-order COD chua thanh toan.",
      );
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong xu ly duoc seller-order nay.");
    } finally {
      setActingOrderId("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khach hang"
        title="Lich su mua hang"
        description="Moi cum don duoc nhom theo cung ma checkout. Ben trong moi cum, tung seller co trang thai va tien thanh toan rieng."
      />
      {loading ? <EmptyState title="Dang tai don hang" description="He thong dang lay danh sach don hang tu backend." /> : null}
      {!loading && error ? <EmptyState title="Khong tai duoc don hang" description={error} /> : null}
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
                      <p className="text-xs uppercase tracking-[0.28em] text-cyan-700">Cum checkout</p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{group.orderCode}</h2>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                          {group.sellerCount} seller
                        </span>
                        {group.completedCount ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
                            {group.completedCount} da hoan tat
                          </span>
                        ) : null}
                        {group.processingCount ? (
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm text-cyan-800">
                            {group.processingCount} dang xu ly
                          </span>
                        ) : null}
                        {group.failedCount ? (
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-800">
                            {group.failedCount} huy/hoan tien
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[22rem]">
                      <div className="rounded-[1.25rem] bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ngay tao cum</p>
                        <p className="mt-2 font-medium text-slate-900">{formatDateTime(group.createdAt)}</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tong tien ca cum</p>
                        <p className="mt-2 font-medium text-slate-900">
                          <MoneyText value={group.totalAmount} />
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {actions.canPayWithVnpay ? (
                      <Button
                        loading={payingGroupCode === group.orderCode}
                        onClick={() => handlePayGroupWithVnpay(group)}
                      >
                        Thanh toan ca cum VNPAY
                      </Button>
                    ) : null}
                    {actions.canSwitchToCod ? (
                      <Button
                        variant="secondary"
                        loading={switchingGroupCode === group.orderCode}
                        onClick={() => handleSwitchGroupToCod(group)}
                      >
                        Chuyen ca cum sang COD
                      </Button>
                    ) : null}
                    {actions.canCancelGroup ? (
                      <Button variant="danger" onClick={() => setCancelGroup(group)}>
                        {actions.canRequestRefundCancel ? "Hoan tien ca cum don" : "Huy ca cum don"}
                      </Button>
                    ) : null}
                    <Link to="/products">
                      <Button variant="secondary">Mua lai</Button>
                    </Link>
                    <Button variant="outline">Lien he ho tro</Button>
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
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ma seller-order</p>
                              <p className="mt-2 font-medium text-slate-900">#{order.id}</p>
                            </div>
                            <div className="rounded-[1rem] bg-white p-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ngay tao</p>
                              <p className="mt-2 font-medium text-slate-900">{formatDateTime(order.created_at)}</p>
                            </div>
                            <div className="rounded-[1rem] bg-white p-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tong tien seller</p>
                              <p className="mt-2 font-medium text-slate-900">
                                <MoneyText value={order.amount} />
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link to={`/dashboard/customer/orders/${order.id}`}>
                            <Button variant="secondary" size="sm">
                              Xem chi tiet seller-order
                            </Button>
                          </Link>
                          {sellerActions.canCancelOrder ? (
                            <Button size="sm" variant="danger" onClick={() => setActionOrder(order)}>
                              Huy don seller nay
                            </Button>
                          ) : null}
                          {sellerActions.canRefundOrder ? (
                            <Button size="sm" variant="danger" onClick={() => setActionOrder(order)}>
                              Hoan tien seller nay
                            </Button>
                          ) : null}
                          {isDeliveredOrder(order) ? (
                            <Button size="sm" onClick={() => openReviewModal(order)}>
                              Danh gia san pham cua seller nay
                            </Button>
                          ) : null}
                        </div>
                        {sellerActions.hasPendingRefundRequest ? (
                          <p className="mt-3 text-sm text-orange-700">
                            Seller-order nay dang co yeu cau hoan tien cho admin duyet.
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
              title="Chua co don hang"
              description="Khi ban dat hang, he thong se nhom cac seller-order cung mot lan checkout vao day theo orderCode."
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
            title={cancelGroup && getGroupActions(cancelGroup).canRequestRefundCancel ? "Hoan tien cum don" : "Huy cum don"}
            description={
              cancelGroup
                ? getGroupActions(cancelGroup).canRequestRefundCancel
                  ? "Cum don nay da duoc thanh toan online. He thong se gui yeu cau hoan tien cho toan bo cum don de admin duyet."
                  : "Cum don COD nay dang cho thanh toan. Neu huy, he thong se dong toan bo cum don."
                : ""
            }
            confirmLabel={cancelGroup && getGroupActions(cancelGroup).canRequestRefundCancel ? "Xac nhan hoan tien" : "Xac nhan huy"}
            confirmVariant="danger"
            loading={Boolean(cancelGroup) && cancellingGroupCode === cancelGroup.orderCode}
            onClose={() => setCancelGroup(null)}
            onConfirm={handleCancelGroup}
          />
          <ConfirmModal
            open={Boolean(actionOrder)}
            title={actionOrder && getSellerOrderActions(actionOrder).canRefundOrder ? "Hoan tien seller-order" : "Huy seller-order"}
            description={
              actionOrder
                ? getSellerOrderActions(actionOrder).canRefundOrder
                  ? "Seller-order nay da duoc thanh toan online. He thong se gui yeu cau hoan tien cho phan don cua seller nay de admin duyet."
                  : "Seller-order COD nay dang cho thanh toan. Neu huy, he thong se dong rieng phan don cua seller nay."
                : ""
            }
            confirmLabel={actionOrder && getSellerOrderActions(actionOrder).canRefundOrder ? "Xac nhan hoan tien" : "Xac nhan huy"}
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
      title={order ? `Danh gia seller-order ${order.code} / #${order.id}` : "Danh gia san pham"}
      description="Moi lan mua hop le trong don hoan tat duoc danh gia mot lan."
      onClose={onClose}
      footer={
        selectedEligibility?.canReview ? (
          <div className="flex justify-end">
            <Button onClick={onSubmit} loading={reviewSubmitting}>
              Gui danh gia
            </Button>
          </div>
        ) : null
      }
    >
      {loading ? (
        <p className="text-sm leading-7 text-slate-300">Dang kiem tra dieu kien danh gia cho cac san pham trong don.</p>
      ) : items.length ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Chon lan mua</p>
            <select
              value={selectedOrderItemId}
              onChange={(event) => onOrderItemChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {(item.productNameSnapshot || `San pham #${item.productId}`)} - lan mua #{item.id} - {item.productReview ? "Da danh gia" : "Co the danh gia"}
                </option>
              ))}
            </select>
          </div>
          {selectedItem ? (
            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm font-medium text-white">{selectedItem.productNameSnapshot || `San pham #${selectedItem.productId}`}</p>
              <p className="mt-2 text-sm text-slate-400">So luong: {selectedItem.quantity}</p>
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
                placeholder="Chia se cam nhan cua ban ve san pham"
              />
            </div>
          ) : (
            <div className="rounded-[1.5rem] bg-slate-800/80 p-4 text-sm leading-7 text-slate-300">
              {selectedEligibility?.reason || "San pham nay hien chua the danh gia."}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm leading-7 text-slate-300">Don nay chua co san pham hop le de danh gia.</p>
      )}
    </Modal>
  );
}

export default MyOrdersPage;
