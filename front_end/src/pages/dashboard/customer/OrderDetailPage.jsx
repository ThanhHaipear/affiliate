import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cancelCustomerOrder, getCustomerOrderDetail } from "../../../api/orderApi";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
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

  if (loading) {
    return <EmptyState title="Đang tải chi tiết đơn" description="Hệ thống đang đọc đơn hàng từ database." />;
  }

  if (error || !order) {
    return <EmptyState title="Không tìm thấy đơn hàng" description={error || "Đơn hàng không tồn tại."} />;
  }

  const items = order.raw?.items || [];
  const payment = order.raw?.payments?.[0];
  const canCancelOrder = order.order_status === "PENDING_PAYMENT";

  async function handleCancelOrder() {
    try {
      setCancelling(true);
      const response = await cancelCustomerOrder(orderId, { reason: "Customer cancelled unpaid order" });
      setOrder({ ...mapOrderDto(response), raw: response });
      setCancelOpen(false);
      toast.success("Đã hủy đơn hàng chờ thanh toán.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không hủy được đơn hàng.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khách hàng"
        title={`Chi tiết đơn ${order.code}`}
        description="Xem thông tin người nhận, sản phẩm, thanh toán và timeline tiến trình đơn hàng."
        action={
          <div className="flex gap-3">
            {canCancelOrder ? (
              <Button variant="danger" onClick={() => setCancelOpen(true)}>
                Hủy đơn
              </Button>
            ) : null}
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
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoRow label="Ngày đặt" value={formatDateTime(order.created_at)} />
              <InfoRow label="Tổng thanh toán" value={<MoneyText value={order.amount} className="font-semibold text-slate-900" />} />
              <InfoRow label="Người nhận" value={order.raw?.shippingRecipientName || order.raw?.buyerName || "--"} />
              <InfoRow label="Số điện thoại" value={order.raw?.shippingPhone || order.raw?.buyerPhone || "--"} />
              <InfoRow label="Email" value={order.raw?.buyerEmail || "--"} />
              <InfoRow label="Phương thức thanh toán" value={payment?.method || "--"} />
              <InfoRow label="Phương thức giao hàng" value={order.raw?.shippingMethod || "--"} />
              <InfoRow
                label="Địa chỉ giao hàng"
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
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Sản phẩm trong đơn</h3>
            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.productNameSnapshot || `Sản phẩm #${item.productId}`}</p>
                      <p className="mt-1 text-sm text-slate-500">Số lượng: {item.quantity}</p>
                    </div>
                    <MoneyText value={item.lineTotal || item.unitPrice || 0} className="font-semibold text-slate-900" />
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
      <ConfirmModal
        open={cancelOpen}
        title="Hủy đơn hàng"
        description="Đơn này đang chờ thanh toán. Nếu hủy, hệ thống sẽ đóng đơn và trả lại lượng hàng đang được giữ chỗ."
        confirmLabel="Xác nhận hủy"
        confirmVariant="danger"
        loading={cancelling}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelOrder}
      />
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
