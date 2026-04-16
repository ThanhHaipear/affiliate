import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  cancelSellerOrder,
  confirmSellerReceivedMoney,
  getSellerOrders,
  refundSellerOrder,
} from "../../../api/sellerApi";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { mapOrderDto } from "../../../lib/apiMappers";
import { formatDateTime } from "../../../lib/format";
import { buildSellerOrderTimeline } from "../../../lib/sellerOrders";

function getSellerOrderActions(order) {
  const isTerminal = ["CANCELLED", "REFUNDED", "COMPLETED"].includes(order?.order_status);
  const hasPendingRefundRequest = order?.raw?.refunds?.some((refund) => refund.status === "PENDING");
  const isPaidOrder = order?.order_status === "PAID" && order?.payment_status === "PAID" && !order?.seller_confirmed_received_money;
  const isUnpaidOrder = order?.order_status === "PENDING_PAYMENT" && order?.payment_status === "PENDING";

  return {
    canConfirmComplete: !isTerminal && !order?.seller_confirmed_received_money && !hasPendingRefundRequest,
    canRefund: isPaidOrder && !hasPendingRefundRequest,
    canCancel: isUnpaidOrder,
    hasPendingRefundRequest,
  };
}

function SellerOrderDetailPage() {
  const { orderId } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openRefund, setOpenRefund] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundReasonError, setRefundReasonError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");
        const response = await getSellerOrders();
        if (!active) {
          return;
        }
        const found = (response || []).find((item) => String(item.id) === String(orderId));
        setOrder(found ? { ...mapOrderDto(found), raw: found } : null);
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

  const orderItems = order?.raw?.items || [];
  const timeline = useMemo(() => (order?.raw ? buildSellerOrderTimeline(order.raw) : []), [order]);
  const affiliateOrder = orderItems.some((item) => item.affiliateId);
  const platformFee = orderItems.reduce((sum, item) => sum + Number(item.platformFeeAmount || 0), 0);
  const commission = orderItems.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0);
  const actions = getSellerOrderActions(order);

  async function refreshOrder() {
    const response = await getSellerOrders();
    const found = (response || []).find((item) => String(item.id) === String(orderId));
    setOrder(found ? { ...mapOrderDto(found), raw: found } : null);
  }

  async function handleConfirmReceivedMoney() {
    if (!order) {
      return;
    }

    try {
      setSubmitting(true);
      const updated = await confirmSellerReceivedMoney(order.id);
      setOrder({ ...mapOrderDto(updated), raw: updated });
      toast.success("Da xac nhan hoan tat don hang.");
      setOpenConfirm(false);
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong xac nhan duoc don hang.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefundOrder() {
    if (!order) {
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
      await refundSellerOrder(order.id, { reason: normalizedReason });
      await refreshOrder();
      toast.success("Da gui yeu cau hoan tien cho admin duyet.");
      setOpenRefund(false);
      setRefundReason("");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong hoan tien duoc don hang.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelOrder() {
    if (!order) {
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
      await cancelSellerOrder(order.id, { reason: normalizedReason });
      await refreshOrder();
      toast.success("Da huy don hang.");
      setOpenCancel(false);
      setCancelReason("");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong huy duoc don hang.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <EmptyState title="Dang tai chi tiet don hang" description="He thong dang dong bo chi tiet don hang." />;
  }

  if (error || !order) {
    return <EmptyState title="Khong tai duoc don hang" description={error || "Don hang khong ton tai."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title={`Chi tiet ${order.code}`}
        description="Don da thanh toan se cho phep hoan tien hoac xac nhan hoan tat. Don chua thanh toan se cho phep xac nhan hoan tat hoac huy don."
        action={
          actions.canConfirmComplete || actions.canRefund || actions.canCancel ? (
            <div className="flex flex-wrap gap-3">
              {actions.canConfirmComplete ? (
                <Button onClick={() => setOpenConfirm(true)}>Xac nhan hoan tat don</Button>
              ) : null}
              {actions.canRefund ? (
                <Button variant="danger" onClick={() => setOpenRefund(true)}>
                  Hoan tien
                </Button>
              ) : null}
              {actions.canCancel ? (
                <Button variant="danger" onClick={() => setOpenCancel(true)}>
                  Huy don
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Panel title="Tong quan don hang">
            <div className="grid gap-4 md:grid-cols-2">
              <Metric label="Ngay dat" value={formatDateTime(order.raw.createdAt)} />
              <Metric label="Tong tien" value={<MoneyText value={order.amount} />} />
              <Metric label="Thanh toan" value={<StatusBadge status={order.payment_status} />} />
              <Metric label="Trang thai don" value={<StatusBadge status={order.order_status} />} />
              <Metric
                label="Affiliate"
                value={
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      affiliateOrder ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {affiliateOrder ? "Co" : "Khong"}
                  </span>
                }
              />
              <Metric label="Nguon don" value={affiliateOrder ? "Don qua affiliate" : "Don truc tiep"} />
            </div>
          </Panel>
          <Panel title="San pham trong don">
            <div className="space-y-4">
              {orderItems.map((item, index) => (
                <div key={`${item.id || index}`} className="rounded-[1.5rem] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.productNameSnapshot || `San pham #${item.productId}`}</p>
                      <p className="mt-2 text-sm text-slate-600">So luong: {item.quantity || 1}</p>
                      <p className={`mt-2 text-sm ${item.affiliateId ? "text-emerald-700" : "text-slate-500"}`}>
                        Affiliate: {item.affiliateId ? "Co" : "Khong"}
                      </p>
                    </div>
                    <MoneyText value={item.totalPrice || item.subtotalAmount || item.lineTotal || 0} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Affiliate va doi soat">
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Nguon don</span>
                <span className="font-medium text-slate-900">{affiliateOrder ? "Don qua affiliate" : "Don truc tiep"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Affiliate</span>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    affiliateOrder ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {affiliateOrder ? "Co" : "Khong"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hoa hong tiep thi</span>
                <MoneyText value={commission} />
              </div>
              <div className="flex items-center justify-between">
                <span>Phi san</span>
                <MoneyText value={platformFee} />
              </div>
              <div className="flex items-center justify-between">
                <span>Shop da xac nhan hoan tat</span>
                <StatusBadge status={order.seller_confirmed_received_money ? "APPROVED" : "PENDING"} />
              </div>
              {order.raw?.refunds?.[0] ? (
                <div className="flex items-center justify-between">
                  <span>Yeu cau huy/hoan tien</span>
                  <StatusBadge status={order.raw.refunds[0].status} />
                </div>
              ) : null}
            </div>
            <div className="mt-4 rounded-[1.5rem] bg-amber-50 p-4 text-sm leading-7 text-amber-800">
              Don da thanh toan cho phep hoan tien hoac xac nhan hoan tat. Don chua thanh toan cho phep xac nhan hoan tat hoac huy don.
            </div>
          </Panel>
          <Panel title="Tien trinh">
            <div className="space-y-4">
              {timeline.map((event) => (
                <div key={event.id} className="rounded-[1.5rem] border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">{event.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{formatDateTime(event.time)}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{event.description}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <ConfirmModal
        open={openConfirm}
        title="Xac nhan hoan tat don"
        description={`Neu xac nhan ${order.code}, he thong se chot don sang trang thai hoan tat va thuc hien doi soat cho don nay.`}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleConfirmReceivedMoney}
        loading={submitting}
      />
      <ConfirmModal
        open={openRefund}
        title="Hoan tien don hang"
        description={`Neu hoan tien ${order.code}, he thong se dao trang thai thanh toan va khong cong tien cho shop.`}
        confirmLabel="Hoan tien"
        confirmVariant="danger"
        onClose={() => {
          setOpenRefund(false);
          setRefundReason("");
          setRefundReasonError("");
        }}
        onConfirm={handleRefundOrder}
        loading={submitting}
      >
        <label className="block text-sm font-medium text-slate-200" htmlFor="seller-order-detail-refund-reason">
          Ly do hoan tien
        </label>
        <textarea
          id="seller-order-detail-refund-reason"
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
        open={openCancel}
        title="Huy don hang"
        description={`Neu huy ${order.code}, he thong se huy don chua thanh toan va giai phong ton kho dang giu cho don nay.`}
        confirmLabel="Huy don"
        confirmVariant="danger"
        onClose={() => {
          setOpenCancel(false);
          setCancelReason("");
          setCancelReasonError("");
        }}
        onConfirm={handleCancelOrder}
        loading={submitting}
      >
        <label className="block text-sm font-medium text-slate-200" htmlFor="seller-order-detail-cancel-reason">
          Ly do huy don
        </label>
        <textarea
          id="seller-order-detail-cancel-reason"
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

function Panel({ title, children }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default SellerOrderDetailPage;
