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
import {
  cancelSellerOrder,
  confirmSellerReceivedMoney,
  getSellerOrders,
  refundSellerOrder,
} from "../../../api/sellerApi";

const completedOrderStatusClassName = "bg-sky-50 text-sky-800";

function getSellerOrderActions(order) {
  const isTerminal = ["CANCELLED", "REFUNDED", "COMPLETED"].includes(order.order_status);
  const hasPendingRefundRequest = order.raw?.refunds?.some((refund) => refund.status === "PENDING");
  const isPaidOrder = order.order_status === "PAID" && order.payment_status === "PAID" && !order.seller_confirmed_received_money;
  const isUnpaidOrder = order.order_status === "PENDING_PAYMENT" && order.payment_status === "PENDING";

  return {
    canConfirmComplete: !isTerminal && !order.seller_confirmed_received_money && !hasPendingRefundRequest,
    canRefund: isPaidOrder && !hasPendingRefundRequest,
    canCancel: isUnpaidOrder,
    hasPendingRefundRequest,
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
          affiliate_name: item.items?.some((entry) => entry.affiliateId) ? "Don qua affiliate" : "Don truc tiep",
          has_affiliate_attribution: item.items?.some((entry) => entry.affiliateId),
        })),
      );
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Khong tai duoc don hang cua shop.");
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
              affiliate_name: order.items?.some((entry) => entry.affiliateId) ? "Don qua affiliate" : "Don truc tiep",
              has_affiliate_attribution: order.items?.some((entry) => entry.affiliateId),
            };

      const hasAffiliateAttribution =
        normalized.has_affiliate_attribution ?? normalized.raw?.items?.some((entry) => entry.affiliateId) ?? false;

      return {
        ...normalized,
        affiliate_name:
          normalized.affiliate_name || (hasAffiliateAttribution ? "Don qua affiliate" : "Don truc tiep"),
        has_affiliate_attribution: hasAffiliateAttribution,
        ...getSellerOrderActions(normalized),
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
      toast.success("Da xac nhan hoan tat don hang.");
      setSelectedOrder(null);
      if (!initialOrders) {
        await loadOrders();
      }
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong xac nhan duoc don hang.");
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
      setRefundReasonError("Ly do hoan tien phai tu 3 ky tu tro len.");
      return;
    }

    try {
      setSubmitting(true);
      setRefundReasonError("");
      await refundSellerOrder(refundTarget.id, { reason: normalizedReason });
      toast.success("Da gui yeu cau hoan tien cho admin duyet.");
      setRefundTarget(null);
      setRefundReason("");
      if (!initialOrders) {
        await loadOrders();
      }
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong hoan tien duoc don hang.");
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
      setCancelReasonError("Ly do huy don phai tu 3 ky tu tro len.");
      return;
    }

    try {
      setSubmitting(true);
      setCancelReasonError("");
      await cancelSellerOrder(cancelTarget.id, { reason: normalizedReason });
      toast.success("Da huy don hang.");
      setCancelTarget(null);
      setCancelReason("");
      if (!initialOrders) {
        await loadOrders();
      }
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong huy duoc don hang.");
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
        title="Don hang cua shop"
        description="Don da thanh toan se cho phep hoan tien hoac xac nhan hoan tat. Don chua thanh toan se cho phep xac nhan hoan tat hoac huy don."
      />
      {loading ? <EmptyState title="Dang tai don hang cua shop" description="He thong dang lay danh sach don hang tu backend." /> : null}
      {!loading && error ? <EmptyState title="Khong tai duoc don hang" description={error} /> : null}
      {!loading && !error ? (
        <DataTable
          columns={[
            { key: "code", title: "Don hang" },
            { key: "product_name", title: "San pham" },
            { key: "affiliate_name", title: "Nguon don" },
            {
              key: "affiliate_attribution_label",
              title: "Affiliate",
              render: (row) => (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    row.has_affiliate_attribution ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {row.has_affiliate_attribution ? "Co" : "Khong"}
                </span>
              ),
            },
            { key: "amount", title: "Gia tri", render: (row) => <MoneyText value={row.amount} /> },
            {
              key: "order_status",
              title: "Trang thai don",
              render: (row) => (
                <StatusBadge
                  status={row.order_status}
                  className={row.order_status === "COMPLETED" ? completedOrderStatusClassName : ""}
                />
              ),
            },
            { key: "payment_status", title: "Thanh toan", render: (row) => <StatusBadge status={row.payment_status} /> },
            { key: "created_at", title: "Ngay tao", render: (row) => formatDateTime(row.created_at) },
            {
              key: "actions",
              title: "Tac vu",
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
                  return <StatusBadge status="PENDING" />;
                }

                if (!row.canConfirmComplete && !row.canRefund && !row.canCancel) {
                  return <span className="text-sm text-slate-500">Khong con thao tac</span>;
                }

                return (
                  <div className="flex flex-wrap gap-2">
                    {row.canConfirmComplete ? (
                      <Button size="sm" onClick={() => setSelectedOrder(row)}>
                        Xac nhan hoan tat don
                      </Button>
                    ) : null}
                    {row.canRefund ? (
                      <Button size="sm" variant="danger" onClick={() => openRefundModal(row)}>
                        Hoan tien
                      </Button>
                    ) : null}
                    {row.canCancel ? (
                      <Button size="sm" variant="danger" onClick={() => openCancelModal(row)}>
                        Huy don
                      </Button>
                    ) : null}
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
        title="Xac nhan hoan tat don"
        description={`Neu xac nhan don ${selectedOrder?.code}, he thong se chot don sang trang thai hoan tat va thuc hien doi soat tien cho shop, phi san, hoa hong affiliate neu co.`}
        confirmLabel="Xac nhan"
        loading={submitting}
        onClose={() => setSelectedOrder(null)}
        onConfirm={handleConfirmReceivedMoney}
      />
      <ConfirmModal
        open={Boolean(refundTarget)}
        title="Hoan tien don hang"
        description={`Neu hoan tien don ${refundTarget?.code}, he thong se dao trang thai thanh toan va khong cong tien cho shop.`}
        confirmLabel="Hoan tien"
        confirmVariant="danger"
        loading={submitting}
        onClose={closeRefundModal}
        onConfirm={handleRefundOrder}
      >
        <label className="block text-sm font-medium text-slate-200" htmlFor="seller-refund-reason">
          Ly do hoan tien
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
          placeholder="Nhap ly do hoan tien"
        />
        {refundReasonError ? <p className="mt-2 text-sm text-rose-300">{refundReasonError}</p> : null}
      </ConfirmModal>
      <ConfirmModal
        open={Boolean(cancelTarget)}
        title="Huy don hang"
        description={`Neu huy don ${cancelTarget?.code}, he thong se huy don chua thanh toan va giai phong so luong dang giu cho don nay.`}
        confirmLabel="Huy don"
        confirmVariant="danger"
        loading={submitting}
        onClose={closeCancelModal}
        onConfirm={handleCancelOrder}
      >
        <label className="block text-sm font-medium text-slate-200" htmlFor="seller-cancel-reason">
          Ly do huy don
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
          placeholder="Nhap ly do huy don"
        />
        {cancelReasonError ? <p className="mt-2 text-sm text-rose-300">{cancelReasonError}</p> : null}
      </ConfirmModal>
    </div>
  );
}

export default SellerOrdersPage;
