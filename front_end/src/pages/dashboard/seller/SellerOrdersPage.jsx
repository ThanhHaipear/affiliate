import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import SearchBar from "../../../components/common/SearchBar";
import Select from "../../../components/common/Select";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapOrderDto } from "../../../lib/apiMappers";
import {
  cancelSellerOrder,
  confirmSellerReceivedMoney,
  getSellerOrders,
  refundSellerOrder,
} from "../../../api/sellerApi";

const completedOrderStatusClassName = "bg-sky-50 text-sky-800";
const ORDERS_PER_PAGE = 8;

function getSellerOrderActions(order) {
  const isTerminal = ["CANCELLED", "REFUNDED", "COMPLETED"].includes(order.order_status);
  const hasPendingRefundRequest = order.raw?.refunds?.some((refund) => refund.status === "PENDING");
  const isPaidOrder =
    order.order_status === "PAID" &&
    order.payment_status === "PAID" &&
    !order.seller_confirmed_received_money;
  const isUnpaidOrder = order.order_status === "PENDING_PAYMENT" && order.payment_status === "PENDING";

  return {
    canConfirmComplete: !isTerminal && !order.seller_confirmed_received_money && !hasPendingRefundRequest,
    canRefund: isPaidOrder && !hasPendingRefundRequest,
    canCancel: isUnpaidOrder,
    hasPendingRefundRequest,
  };
}

function getOrderSortPriority(order) {
  if (order.canConfirmComplete) {
    return 0;
  }

  if (order.hasPendingRefundRequest) {
    return 1;
  }

  return 2;
}

function getOrderTimestamp(order) {
  return new Date(order.created_at || order.raw?.createdAt || 0).getTime();
}

function normalizeSellerOrder(order) {
  const normalized =
    "raw" in order || "order_status" in order
      ? order
      : {
        ...mapOrderDto(order),
        raw: order,
        affiliate_name: order.items?.some((entry) => entry.affiliateId) ? "Đơn qua affiliate" : "Đơn trực tiếp",
        has_affiliate_attribution: order.items?.some((entry) => entry.affiliateId),
      };

  const hasAffiliateAttribution =
    normalized.has_affiliate_attribution ?? normalized.raw?.items?.some((entry) => entry.affiliateId) ?? false;

  return {
    ...normalized,
    affiliate_name:
      normalized.affiliate_name || (hasAffiliateAttribution ? "Đơn qua affiliate" : "Đơn trực tiếp"),
    has_affiliate_attribution: hasAffiliateAttribution,
    ...getSellerOrderActions(normalized),
  };
}

function SellerOrdersPage({ orders: initialOrders, onConfirmReceivedMoney }) {
  const toast = useToast();
  const [orders, setOrders] = useState(initialOrders || []);
  const [loading, setLoading] = useState(!initialOrders);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundReasonError, setRefundReasonError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [refundFilter, setRefundFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (initialOrders) {
      return undefined;
    }

    loadOrders();
    return undefined;
  }, [initialOrders]);

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const response = await getSellerOrders();
      setOrders((response || []).map(normalizeSellerOrder));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được đơn hàng của shop.");
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => orders.map(normalizeSellerOrder), [orders]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const searchedRows = !normalizedQuery
      ? rows
      : rows.filter((row) =>
        [row.code, row.raw?.buyer?.customerProfile?.fullName, row.raw?.buyer?.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );

    const matchedRows = searchedRows.filter((row) => {
      const matchesOrderStatus = orderStatusFilter === "ALL" || row.order_status === orderStatusFilter;
      const matchesPaymentStatus = paymentStatusFilter === "ALL" || row.payment_status === paymentStatusFilter;
      const matchesRefund =
        refundFilter === "ALL" ||
        (refundFilter === "PENDING" && row.hasPendingRefundRequest) ||
        (refundFilter === "NONE" && !(row.raw?.refunds || []).length);

      return matchesOrderStatus && matchesPaymentStatus && matchesRefund;
    });

    return [...matchedRows].sort((left, right) => {
      const priorityDiff = getOrderSortPriority(left) - getOrderSortPriority(right);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return getOrderTimestamp(right) - getOrderTimestamp(left);
    });
  }, [orderStatusFilter, paymentStatusFilter, refundFilter, rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ORDERS_PER_PAGE));

  const paginatedRows = useMemo(() => {
    const startIndex = (page - 1) * ORDERS_PER_PAGE;
    return filteredRows.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [filteredRows, page]);

  useEffect(() => {
    setPage(1);
  }, [orderStatusFilter, paymentStatusFilter, refundFilter, searchQuery]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(filteredRows.length / ORDERS_PER_PAGE))));
  }, [filteredRows]);

  async function handleConfirmReceivedMoney() {
    if (!selectedOrder) {
      return;
    }

    try {
      setSubmitting(true);
      if (onConfirmReceivedMoney) {
        await onConfirmReceivedMoney(selectedOrder);
      } else {
        await confirmSellerReceivedMoney(selectedOrder.id);
      }
      toast.success("Đã xác nhận hoàn tất đơn hàng.");
      setSelectedOrder(null);
      if (!initialOrders) {
        await loadOrders();
      }
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không xác nhận được đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefundOrder() {
    if (!refundTarget) {
      return;
    }

    const normalizedReason = refundReason.trim();
    if (normalizedReason.length < 3) {
      setRefundReasonError("Lý do hoàn tiền phải từ 3 ký tự trở lên.");
      return;
    }

    try {
      setSubmitting(true);
      setRefundReasonError("");
      await refundSellerOrder(refundTarget.id, { reason: normalizedReason });
      toast.success("Đã gửi yêu cầu hoàn tiền cho admin duyệt.");
      setRefundTarget(null);
      setRefundReason("");
      if (!initialOrders) {
        await loadOrders();
      }
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không hoàn tiền được đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelOrder() {
    if (!cancelTarget) {
      return;
    }

    const normalizedReason = cancelReason.trim();
    if (normalizedReason.length < 3) {
      setCancelReasonError("Lý do hủy đơn phải từ 3 ký tự trở lên.");
      return;
    }

    try {
      setSubmitting(true);
      setCancelReasonError("");
      await cancelSellerOrder(cancelTarget.id, { reason: normalizedReason });
      toast.success("Đã hủy đơn hàng.");
      setCancelTarget(null);
      setCancelReason("");
      if (!initialOrders) {
        await loadOrders();
      }
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không hủy được đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  function openRefundModal(order) {
    setRefundTarget(order);
    setRefundReason("");
    setRefundReasonError("");
  }

  function closeRefundModal() {
    setRefundTarget(null);
    setRefundReason("");
    setRefundReasonError("");
  }

  function openCancelModal(order) {
    setCancelTarget(order);
    setCancelReason("");
    setCancelReasonError("");
  }

  function closeCancelModal() {
    setCancelTarget(null);
    setCancelReason("");
    setCancelReasonError("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Đơn hàng"

        action={
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm theo mã đơn hàng..."
          />
        }
      />

      <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <Select
          label="Trạng thái đơn"
          value={orderStatusFilter}
          onChange={(event) => setOrderStatusFilter(event.target.value)}
          options={[
            { label: "Tất cả", value: "ALL" },
            { label: "Chờ thanh toán", value: "PENDING_PAYMENT" },
            { label: "Đã thanh toán", value: "PAID" },
            { label: "Hoàn tất", value: "COMPLETED" },
            { label: "Đã hủy", value: "CANCELLED" },
            { label: "Đã hoàn tiền", value: "REFUNDED" },
          ]}
        />
        <Select
          label="Trạng thái thanh toán"
          value={paymentStatusFilter}
          onChange={(event) => setPaymentStatusFilter(event.target.value)}
          options={[
            { label: "Tất cả", value: "ALL" },
            { label: "Chờ thanh toán", value: "PENDING" },
            { label: "Đã thanh toán", value: "PAID" },
            { label: "Thất bại", value: "FAILED" },
            { label: "Đã hoàn tiền", value: "REFUNDED" },
          ]}
        />
        <Select
          label="Yêu cầu hoàn tiền"
          value={refundFilter}
          onChange={(event) => setRefundFilter(event.target.value)}
          options={[
            { label: "Tất cả", value: "ALL" },
            { label: "Đang chờ duyệt", value: "PENDING" },
            { label: "Chưa có yêu cầu", value: "NONE" },
          ]}
        />
      </div>

      {loading ? (
        <EmptyState title="Đang tải đơn hàng" description="Hệ thống đang lấy danh sách đơn hàng của shop từ backend." />
      ) : null}

      {!loading && error ? <EmptyState title="Không tải được đơn hàng" description={error} /> : null}

      {!loading && !error ? (
        <>
          <DataTable
            columns={[
              {
                key: "code",
                title: "Đơn hàng",
                render: (row) => (
                  <Link
                    to={`/dashboard/seller/orders/${row.id}`}
                    className="font-medium text-sky-700 transition hover:text-sky-800 hover:underline"
                  >
                    {row.code}
                  </Link>
                ),
              },
              { key: "product_name", title: "Sản phẩm" },
              { key: "affiliate_name", title: "Nguồn đơn" },
              {
                key: "affiliate_attribution_label",
                title: "Affiliate",
                render: (row) => (
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.has_affiliate_attribution ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    {row.has_affiliate_attribution ? "Có" : "Không"}
                  </span>
                ),
              },
              { key: "amount", title: "Giá trị", render: (row) => <MoneyText value={row.amount} /> },
              {
                key: "order_status",
                title: "Trạng thái đơn",
                render: (row) => (
                  <StatusBadge
                    status={row.order_status}
                    className={row.order_status === "COMPLETED" ? completedOrderStatusClassName : ""}
                  />
                ),
              },
              {
                key: "payment_status",
                title: "Thanh toán",
                render: (row) => <StatusBadge status={row.payment_status} />,
              },
              { key: "created_at", title: "Ngày tạo", render: (row) => formatDateTime(row.created_at) },
              {
                key: "actions",
                title: "Tác vụ",
                render: (row) => {
                  if (row.seller_confirmed_received_money) {
                    return <StatusBadge status="COMPLETED" className={completedOrderStatusClassName} />;
                  }

                  if (row.order_status === "REFUNDED") {
                    return <StatusBadge status="REFUNDED" />;
                  }

                  if (row.order_status === "CANCELLED") {
                    return <StatusBadge status="CANCELLED" />;
                  }

                  if (row.hasPendingRefundRequest) {
                    return (
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Chờ duyệt hoàn tiền
                      </span>
                    );
                  }

                  if (!row.canConfirmComplete && !row.canRefund && !row.canCancel) {
                    return <span className="text-sm text-slate-500">Không còn thao tác</span>;
                  }

                  return (
                    <div className="flex flex-wrap gap-2">
                      {row.canConfirmComplete ? (
                        <Button size="sm" onClick={() => setSelectedOrder(row)}>
                          Xác nhận hoàn tất đơn
                        </Button>
                      ) : null}
                      {row.canRefund ? (
                        <Button size="sm" variant="danger" onClick={() => openRefundModal(row)}>
                          Hoàn tiền
                        </Button>
                      ) : null}
                      {row.canCancel ? (
                        <Button size="sm" variant="danger" onClick={() => openCancelModal(row)}>
                          Hủy đơn
                        </Button>
                      ) : null}
                    </div>
                  );
                },
              },
            ]}
            rows={paginatedRows}
            emptyTitle="Chưa có đơn hàng"
            emptyDescription="Danh sách đơn hàng của shop hiện chưa có dữ liệu phù hợp với bộ lọc tìm kiếm."
          />

          {filteredRows.length > ORDERS_PER_PAGE ? (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </>
      ) : null}

      <ConfirmModal
        open={Boolean(selectedOrder)}
        title="Xác nhận hoàn tất đơn"
        description={`Nếu xác nhận đơn ${selectedOrder?.code}, hệ thống sẽ chốt đơn sang trạng thái hoàn tất và thực hiện đối soát tiền cho shop, phí sàn và hoa hồng affiliate nếu có.`}
        confirmLabel="Xác nhận"
        loading={submitting}
        onClose={() => setSelectedOrder(null)}
        onConfirm={handleConfirmReceivedMoney}
      />

      <ConfirmModal
        open={Boolean(refundTarget)}
        title="Hoàn tiền đơn hàng"
        description={`Nếu hoàn tiền đơn ${refundTarget?.code}, hệ thống sẽ đảo trạng thái thanh toán và không cộng tiền cho shop.`}
        confirmLabel="Hoàn tiền"
        confirmVariant="danger"
        loading={submitting}
        onClose={closeRefundModal}
        onConfirm={handleRefundOrder}
      >
        <label className="block text-sm font-medium text-slate-200" htmlFor="seller-refund-reason">
          Lý do hoàn tiền
        </label>
        <textarea
          id="seller-refund-reason"
          value={refundReason}
          onChange={(event) => {
            setRefundReason(event.target.value);
            if (refundReasonError) {
              setRefundReasonError("");
            }
          }}
          rows={4}
          className="mt-2 w-full rounded-2xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
          placeholder="Nhập lý do hoàn tiền"
        />
        {refundReasonError ? <p className="mt-2 text-sm text-rose-300">{refundReasonError}</p> : null}
      </ConfirmModal>

      <ConfirmModal
        open={Boolean(cancelTarget)}
        title="Hủy đơn hàng"
        description={`Nếu hủy đơn ${cancelTarget?.code}, hệ thống sẽ hủy đơn chưa thanh toán và giải phóng số lượng đang giữ cho đơn này.`}
        confirmLabel="Hủy đơn"
        confirmVariant="danger"
        loading={submitting}
        onClose={closeCancelModal}
        onConfirm={handleCancelOrder}
      >
        <label className="block text-sm font-medium text-slate-200" htmlFor="seller-cancel-reason">
          Lý do hủy đơn
        </label>
        <textarea
          id="seller-cancel-reason"
          value={cancelReason}
          onChange={(event) => {
            setCancelReason(event.target.value);
            if (cancelReasonError) {
              setCancelReasonError("");
            }
          }}
          rows={4}
          className="mt-2 w-full rounded-2xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
          placeholder="Nhập lý do hủy đơn"
        />
        {cancelReasonError ? <p className="mt-2 text-sm text-rose-300">{cancelReasonError}</p> : null}
      </ConfirmModal>
    </div>
  );
}

export default SellerOrdersPage;
