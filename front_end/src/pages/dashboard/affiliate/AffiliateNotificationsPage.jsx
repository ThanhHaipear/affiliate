import { useEffect, useState } from "react";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../../../api/notificationApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapNotificationDto } from "../../../lib/apiMappers";

function AffiliateNotificationsPage() {
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
      const response = await getNotifications({ audience: "affiliate" });
      setItems((response || []).map(mapNotificationDto));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được thông báo affiliate.");
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
      await markAllNotificationsAsRead({ audience: "affiliate" });
      setItems((current) => current.map((item) => ({ ...item, unread: false })));
      toast.success("Đã đánh dấu đã đọc toàn bộ thông báo affiliate.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được thông báo.");
    }
  }

  if (loading) {
    return <EmptyState title="Đang tải thông báo affiliate" description="Hệ thống đang đọc notifications affiliate từ database." />;
  }

  if (error) {
    return <EmptyState title="Không tải được thông báo affiliate" description={error} />;
  }

  if (!items.length) {
    return <EmptyState title="Chưa có thông báo affiliate" description="Khi có sự kiện liên quan đến commission, withdrawal hoặc review, thông báo sẽ hiện tại đây." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate"
        title="Thông báo affiliate"
        description="Theo dõi commission, rút tiền, duyệt affiliate và các thay đổi liên quan đến hoạt động tiếp thị."
        action={<Button variant="secondary" onClick={handleReadAll}>Đánh dấu đã đọc tất cả</Button>}
      />
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={item.unread ? "PENDING" : "APPROVED"} />
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.type}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400">{formatDateTime(item.created_at)}</p>
              </div>
              {item.unread ? <Button variant="secondary" size="sm" onClick={() => handleRead(item.id)}>Đã đọc</Button> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AffiliateNotificationsPage;
