import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapOrderDto } from "../../../lib/apiMappers";
import { confirmSellerReceivedMoney, getSellerOrders, refundSellerOrder } from "../../../api/sellerApi";

function SellerOrdersPage({ orders: initialOrders, onConfirmReceivedMoney }) {
  const toast = useToast();
  const [orders, setOrders] = useState(initialOrders || []);
  const [loading, setLoading] = useState(!initialOrders);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundReasonError, setRefundReasonError] = useState("");

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
      setOrders(
        (response || []).map((item) => ({
          ...mapOrderDto(item),
          raw: item,
          affiliate_name: item.items?.some((entry) => entry.affiliateId) ? "Đơn qua affiliate" : "Đơn trực tiếp",
          has_affiliate_attribution: item.items?.some((entry) => entry.affiliateId),
        })),
      );
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được đơn hàng của shop.");
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => {
    return orders.map((order) => {
      const normalized =
        "raw" in order || "order_status" in order
          ? order
          : {
              ...mapOrderDto(order),
              raw: order,
              affiliate_name: order.items?.some((entry) => entry.affiliateId) ? "Đơn qua affiliate" : "Đơn trực tiếp",
              has_affiliate_attribution: order.items?.some((entry) => entry.affiliateId),
            };

      const paymentAwaitingSeller = ["PENDING", "PAID"].includes(normalized.payment_status);
      const terminalOrder = ["CANCELLED", "REFUNDED", "COMPLETED"].includes(normalized.order_status);
      const canTakeSettlementAction = paymentAwaitingSeller && !normalized.seller_confirmed_received_money && !terminalOrder;
      const hasAffiliateAttribution =
        normalized.has_affiliate_attribution ?? normalized.raw?.items?.some((entry) => entry.affiliateId) ?? false;

      return {
        ...normalized,
        affiliate_name:
          normalized.affiliate_name ||
          (hasAffiliateAttribution ? "Đơn qua affiliate" : "Đơn trực tiếp"),
        has_affiliate_attribution: hasAffiliateAttribution,
        can_confirm_seller_received_money: canTakeSettlementAction,
        can_refund_order: canTakeSettlementAction,
      };
    });
  }, [orders]);

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
      toast.success("Đã xác nhận shop đã nhận thanh toán.");
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
      toast.success("Đã hoàn tiền đơn hàng.");
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Đơn hàng của shop"
        description="Khi đơn đang chờ thanh toán, chính shop là bên xác nhận đã nhận tiền hoặc chọn hoàn tiền. Sau khi shop xác nhận, hệ thống mới chốt tiền và hoa hồng."
      />
      {loading ? <EmptyState title="Đang tải đơn hàng của shop" description="Hệ thống đang lấy danh sách đơn hàng từ backend." /> : null}
      {!loading && error ? <EmptyState title="Không tải được đơn hàng" description={error} /> : null}
      {!loading && !error ? (
        <DataTable
          columns={[
            { key: "code", title: "Đơn hàng" },
            { key: "product_name", title: "Sản phẩm" },
            { key: "affiliate_name", title: "Nguồn đơn" },
            {
              key: "affiliate_attribution_label",
              title: "Affiliate",
              render: (row) => (
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.has_affiliate_attribution ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {row.has_affiliate_attribution ? "Có" : "Không"}
                </span>
              ),
            },
            { key: "amount", title: "Giá trị", render: (row) => <MoneyText value={row.amount} /> },
            { key: "order_status", title: "Trạng thái đơn", render: (row) => <StatusBadge status={row.order_status} /> },
            {
              key: "payment_status",
              title: "Thanh toán",
              render: (row) => (
                <span title={row.payment_status === "PENDING" ? "Đang chờ shop xác nhận đã nhận tiền" : undefined}>
                  <StatusBadge status={row.payment_status} />
                </span>
              ),
            },
            { key: "created_at", title: "Ngày tạo", render: (row) => formatDateTime(row.created_at) },
            {
              key: "actions",
              title: "Tác vụ",
              render: (row) => {
                if (row.seller_confirmed_received_money) {
                  return <StatusBadge status="COMPLETED" />;
                }

                if (row.order_status === "REFUNDED") {
                  return <StatusBadge status="REFUNDED" />;
                }

                if (!row.can_confirm_seller_received_money) {
                  return <span className="text-sm text-slate-500">Không còn thao tác</span>;
                }

                return (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setSelectedOrder(row)}>
                      Xác nhận đã nhận tiền
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => openRefundModal(row)}>
                      Hoàn tiền
                    </Button>
                  </div>
                );
              },
            },
          ]}
          rows={rows}
        />
      ) : null}
      <ConfirmModal
        open={Boolean(selectedOrder)}
        title="Xác nhận đã nhận tiền"
        description={`Nếu xác nhận đơn ${selectedOrder?.code}, hệ thống sẽ coi shop đã nhận thanh toán, chốt tiền cho shop và phí sàn. Đơn có affiliate mới cộng hoa hồng tiếp thị.`}
        confirmLabel="Xác nhận"
        loading={submitting}
        onClose={() => setSelectedOrder(null)}
        onConfirm={handleConfirmReceivedMoney}
      />
      <ConfirmModal
        open={Boolean(refundTarget)}
        title="Hoàn tiền đơn hàng"
        description={`Nếu hoàn tiền đơn ${refundTarget?.code}, hệ thống sẽ không cộng tiền cho shop và cũng không phát sinh hoa hồng affiliate.`}
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
    </div>
  );
}

export default SellerOrdersPage;
