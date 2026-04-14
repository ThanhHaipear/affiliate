import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getSellerOrders } from "../../../api/sellerApi";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { mapOrderDto } from "../../../lib/apiMappers";
import { formatDateTime } from "../../../lib/format";
import { buildSellerOrderTimeline } from "../../../mock/sellerPortalData";
import { confirmSellerReceivedMoney, refundSellerOrder } from "../../../api/sellerApi";

function SellerOrderDetailPage() {
  const { orderId } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openRefund, setOpenRefund] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundReasonError, setRefundReasonError] = useState("");

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

  const orderItems = order?.raw?.items || [];
  const timeline = useMemo(() => (order?.raw ? buildSellerOrderTimeline(order.raw) : []), [order]);
  const affiliateOrder = orderItems.some((item) => item.affiliateId);
  const platformFee = orderItems.reduce((sum, item) => sum + Number(item.platformFeeAmount || 0), 0);
  const commission = orderItems.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0);
  const paymentAwaitingSeller = ["PENDING", "PAID"].includes(order?.payment_status);
  const terminalOrder = ["CANCELLED", "REFUNDED", "COMPLETED"].includes(order?.order_status);
  const canTakeSettlementAction = paymentAwaitingSeller && !order?.seller_confirmed_received_money && !terminalOrder;

  async function handleConfirmReceivedMoney() {
    if (!order) {
      return;
    }

    try {
      setSubmitting(true);
      const updated = await confirmSellerReceivedMoney(order.id);
      setOrder({ ...mapOrderDto(updated), raw: updated });
      toast.success("Đã xác nhận đơn hàng đã nhận thanh toán.");
      setOpenConfirm(false);
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không xác nhận được đơn hàng.");
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
      setRefundReasonError("Lý do hoàn tiền phải từ 3 ký tự trở lên.");
      return;
    }

    try {
      setSubmitting(true);
      setRefundReasonError("");
      await refundSellerOrder(order.id, { reason: normalizedReason });
      setOrder((current) => ({ ...current, order_status: "REFUNDED", payment_status: "REFUNDED" }));
      toast.success("Đã hoàn tiền đơn hàng.");
      setOpenRefund(false);
      setRefundReason("");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không hoàn tiền được đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <EmptyState title="Đang tải chi tiết đơn hàng" description="Hệ thống đang đồng bộ chi tiết đơn hàng." />;
  }

  if (error || !order) {
    return <EmptyState title="Không tải được đơn hàng" description={error || "Đơn hàng không tồn tại."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title={`Chi tiết ${order.code}`}
        description="Ở trạng thái chờ thanh toán, shop là bên xác nhận đã nhận tiền hoặc chọn hoàn tiền. Sau thao tác đó hệ thống mới chốt hoặc hủy đối soát cho đơn."
        action={
          canTakeSettlementAction ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setOpenConfirm(true)}>Xác nhận đã nhận tiền</Button>
              <Button variant="danger" onClick={() => setOpenRefund(true)}>
                Hoàn tiền
              </Button>
            </div>
          ) : null
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Panel title="Tổng quan đơn hàng">
            <div className="grid gap-4 md:grid-cols-2">
              <Metric label="Ngày đặt" value={formatDateTime(order.raw.createdAt)} />
              <Metric label="Tổng tiền" value={<MoneyText value={order.amount} />} />
              <Metric label="Thanh toán" value={<StatusBadge status={order.payment_status} />} />
              <Metric label="Trạng thái đơn" value={<StatusBadge status={order.order_status} />} />
              <Metric
                label="Affiliate"
                value={
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${affiliateOrder ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {affiliateOrder ? "Có" : "Không"}
                  </span>
                }
              />
              <Metric label="Nguồn đơn" value={affiliateOrder ? "Đơn qua affiliate" : "Đơn trực tiếp"} />
            </div>
          </Panel>
          <Panel title="Sản phẩm trong đơn">
            <div className="space-y-4">
              {orderItems.map((item, index) => (
                <div key={`${item.id || index}`} className="rounded-[1.5rem] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.productNameSnapshot || `Sản phẩm #${item.productId}`}</p>
                      <p className="mt-2 text-sm text-slate-600">Số lượng: {item.quantity || 1}</p>
                      <p className={`mt-2 text-sm ${item.affiliateId ? "text-emerald-700" : "text-slate-500"}`}>
                        Affiliate: {item.affiliateId ? "Có" : "Không"}
                      </p>
                    </div>
                    <MoneyText value={item.totalPrice || item.subtotalAmount || 0} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Affiliate và đối soát">
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Nguồn đơn</span>
                <span className="font-medium text-slate-900">{affiliateOrder ? "Đơn qua affiliate" : "Đơn trực tiếp"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Affiliate</span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${affiliateOrder ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {affiliateOrder ? "Có" : "Không"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hoa hồng tiếp thị</span>
                <MoneyText value={commission} />
              </div>
              <div className="flex items-center justify-between">
                <span>Phí sàn</span>
                <MoneyText value={platformFee} />
              </div>
              <div className="flex items-center justify-between">
                <span>Shop đã xác nhận tiền</span>
                <StatusBadge status={order.seller_confirmed_received_money ? "APPROVED" : "PENDING"} />
              </div>
            </div>
            <div className="mt-4 rounded-[1.5rem] bg-amber-50 p-4 text-sm leading-7 text-amber-800">
              Ở đơn đang chờ thanh toán, shop là bên xác nhận đã nhận tiền. Nếu shop bấm hoàn tiền, hệ thống sẽ không cộng tiền cho shop và cũng không cộng hoa hồng affiliate.
            </div>
          </Panel>
          <Panel title="Tiến trình">
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
        title="Xác nhận đã nhận tiền"
        description={`Nếu xác nhận ${order.code}, hệ thống sẽ coi shop đã nhận thanh toán, chốt tiền cho shop và phí sàn. Chỉ các dòng có affiliate mới được cộng hoa hồng tiếp thị.`}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleConfirmReceivedMoney}
        loading={submitting}
      />
      <ConfirmModal
        open={openRefund}
        title="Hoàn tiền đơn hàng"
        description={`Nếu hoàn tiền ${order.code}, hệ thống sẽ không cộng tiền cho shop và cũng không phát sinh hoa hồng affiliate.`}
        confirmLabel="Hoàn tiền"
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
          Lý do hoàn tiền
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
          placeholder="Nhập lý do hoàn tiền"
        />
        {refundReasonError ? <p className="mt-2 text-sm text-rose-300">{refundReasonError}</p> : null}
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
