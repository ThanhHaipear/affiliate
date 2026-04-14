import { useEffect, useState } from "react";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../../../api/notificationApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapNotificationDto } from "../../../lib/apiMappers";

function CustomerNotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");
      const response = await getNotifications({ audience: "customer" });
      setItems((response || []).map(mapNotificationDto));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được thông báo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRead(id) {
    try {
      await markNotificationAsRead(id);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, unread: false } : item)));
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được thông báo.");
    }
  }

  async function handleReadAll() {
    try {
      await markAllNotificationsAsRead({ audience: "customer" });
      setItems((current) => current.map((item) => ({ ...item, unread: false })));
      toast.success("Đã đánh dấu đã đọc toàn bộ thông báo.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được thông báo.");
    }
  }

  if (loading) {
    return <EmptyState title="Đang tải thông báo" description="Hệ thống đang đọc notifications của customer từ database." />;
  }

  if (error) {
    return <EmptyState title="Không tải được thông báo" description={error} />;
  }

  if (!items.length) {
    return <EmptyState title="Chưa có thông báo" description="Thông báo đơn hàng và ưu đãi cho customer sẽ xuất hiện tại đây." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khách hàng"
        title="Thông báo customer"
        description="Theo dõi cập nhật đơn hàng, thanh toán và những thay đổi quan trọng liên quan đến tài khoản mua hàng của bạn."
        action={<Button variant="secondary" onClick={handleReadAll}>Đánh dấu đã đọc tất cả</Button>}
      />
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">{item.type}</span>
                  {item.unread ? <StatusBadge status="PENDING" /> : <StatusBadge status="APPROVED" />}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(item.created_at)}</p>
                {item.unread ? <Button variant="secondary" size="sm" onClick={() => handleRead(item.id)}>Đã đọc</Button> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CustomerNotificationsPage;
