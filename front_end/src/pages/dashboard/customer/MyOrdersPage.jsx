import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCustomerOrders } from "../../../api/orderApi";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                  <Link to={`/dashboard/customer/orders/${row.id}`}>
                    <Button variant="secondary" size="sm">
                      Xem đơn
                    </Button>
                  </Link>
                ),
              },
            ]}
            rows={orders}
          />
        </>
      ) : null}
    </div>
  );
}

export default MyOrdersPage;
