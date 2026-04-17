import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCustomerOrders } from "../../../api/orderApi";
import { createProductReview, getProductReviews } from "../../../api/productApi";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import Modal from "../../../components/common/Modal";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapOrderDto } from "../../../lib/apiMappers";

const DELIVERED_ORDER_STATUSES = ["COMPLETED"];
const FAILED_ORDER_STATUSES = ["REFUNDED", "CANCELLED"];

function isDeliveredOrder(order) {
  return DELIVERED_ORDER_STATUSES.includes(order.order_status);
}

function isFailedOrder(order) {
  return FAILED_ORDER_STATUSES.includes(order.order_status);
}

function isProcessingOrder(order) {
  return !isDeliveredOrder(order) && !isFailedOrder(order);
}

function MyOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewEligibility, setReviewEligibility] = useState({});
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");

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

  const summary = useMemo(
    () => [
      {
        label: "Tổng đơn",
        value: `${orders.filter(isDeliveredOrder).length + orders.filter(isProcessingOrder).length + orders.filter(isFailedOrder).length}`,
      },
      { label: "Đơn đã hoàn tất", value: `${orders.filter(isDeliveredOrder).length}` },
      { label: "Đang xử lý", value: `${orders.filter(isProcessingOrder).length}` },
      { label: "Hoàn tiền/hủy", value: `${orders.filter(isFailedOrder).length}` },
    ],
    [orders],
  );

  const reviewItems = useMemo(() => {
    const items = reviewOrder?.raw?.items || [];
    const seen = new Set();

    return items.filter((item) => {
      const key = String(item.productId);
      if (!item.productId || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [reviewOrder]);

  const selectedEligibility = selectedProductId ? reviewEligibility[selectedProductId] || null : null;

  async function openReviewModal(order) {
    const items = order?.raw?.items || [];
    const uniqueProductIds = [...new Set(items.map((item) => String(item.productId)).filter(Boolean))];

    setReviewOrder(order);
    setReviewModalOpen(true);
    setReviewEligibility({});
    setSelectedProductId("");
    setReviewComment("");
    setReviewRating("5");

    if (!uniqueProductIds.length) {
      return;
    }

    try {
      setReviewLoading(true);
      const results = await Promise.all(
        uniqueProductIds.map(async (productId) => {
          const response = await getProductReviews(productId);
          return [productId, response?.viewer || null];
        }),
      );

      const nextEligibility = Object.fromEntries(results);
      setReviewEligibility(nextEligibility);
      setSelectedProductId(
        uniqueProductIds.find((productId) => nextEligibility[productId]?.canReview) || uniqueProductIds[0],
      );
    } catch (_error) {
      setSelectedProductId(uniqueProductIds[0] || "");
    } finally {
      setReviewLoading(false);
    }
  }

  function closeReviewModal() {
    setReviewModalOpen(false);
    setReviewOrder(null);
    setReviewEligibility({});
    setSelectedProductId("");
    setReviewComment("");
    setReviewRating("5");
  }

  async function handleSubmitReview() {
    if (!selectedProductId) {
      return;
    }

    try {
      setReviewSubmitting(true);
      await createProductReview(selectedProductId, {
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      });

      setReviewEligibility((current) => ({
        ...current,
        [selectedProductId]: {
          hasPurchased: true,
          hasReviewed: true,
          canReview: false,
          reason: "Bạn đã đánh giá sản phẩm này rồi.",
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khách hàng"
        title="Lịch sử mua hàng"
        description="Theo dõi mã đơn, ngày mua, tổng tiền, trạng thái đơn và thanh toán trong một bảng dễ quét nhanh."
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
          <DataTable
            columns={[
              { key: "code", title: "Mã đơn" },
              { key: "created_at", title: "Ngày mua", render: (row) => formatDateTime(row.created_at) },
              { key: "amount", title: "Tổng tiền", render: (row) => <MoneyText value={row.amount} /> },
              { key: "order_status", title: "Trạng thái đơn", render: (row) => <StatusBadge status={row.order_status} /> },
              { key: "payment_status", title: "Thanh toán", render: (row) => <StatusBadge status={row.payment_status} /> },
              {
                key: "actions",
                title: "Chi tiết",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/dashboard/customer/orders/${row.id}`}>
                      <Button variant="secondary" size="sm">
                        Xem đơn
                      </Button>
                    </Link>
                    {isDeliveredOrder(row) ? (
                      <Button size="sm" onClick={() => openReviewModal(row)}>
                        Đánh giá
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={orders}
          />
          <ReviewOrderModal
            open={reviewModalOpen}
            order={reviewOrder}
            items={reviewItems}
            eligibility={reviewEligibility}
            loading={reviewLoading}
            selectedProductId={selectedProductId}
            reviewRating={reviewRating}
            reviewComment={reviewComment}
            reviewSubmitting={reviewSubmitting}
            selectedEligibility={selectedEligibility}
            onClose={closeReviewModal}
            onProductChange={setSelectedProductId}
            onRatingChange={setReviewRating}
            onCommentChange={setReviewComment}
            onSubmit={handleSubmitReview}
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
  eligibility,
  loading,
  selectedProductId,
  reviewRating,
  reviewComment,
  reviewSubmitting,
  selectedEligibility,
  onClose,
  onProductChange,
  onRatingChange,
  onCommentChange,
  onSubmit,
}) {
  const selectedItem = items.find((item) => String(item.productId) === String(selectedProductId));

  return (
    <Modal
      open={open}
      title={order ? `Đánh giá đơn ${order.code}` : "Đánh giá sản phẩm"}
      description="Chỉ sản phẩm trong đơn đã giao thành công và chưa được bạn đánh giá mới cho phép gửi review."
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
            <p className="text-sm font-medium text-white">Chọn sản phẩm</p>
            <select
              value={selectedProductId}
              onChange={(event) => onProductChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              {items.map((item) => {
                const itemEligibility = eligibility[String(item.productId)];
                const suffix = itemEligibility?.canReview
                  ? "Có thể đánh giá"
                  : itemEligibility?.hasReviewed
                    ? "Đã đánh giá"
                    : "Chưa đủ điều kiện";

                return (
                  <option key={item.id} value={item.productId}>
                    {(item.productNameSnapshot || `Sản phẩm #${item.productId}`)} - {suffix}
                  </option>
                );
              })}
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
