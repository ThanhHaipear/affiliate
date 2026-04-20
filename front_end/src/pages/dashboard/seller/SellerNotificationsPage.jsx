import { useEffect, useMemo, useState } from "react";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../../api/notificationApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapNotificationDto } from "../../../lib/apiMappers";

const NOTIFICATIONS_PER_PAGE = 8;

function formatNotificationType(type = "") {
  const labelMap = {
    PRODUCT_REVIEW: "Duyệt sản phẩm",
    PRODUCT_AFFILIATE_REVIEW: "Duyệt affiliate cho sản phẩm",
    PRODUCT_HIDDEN_BY_ADMIN: "Sản phẩm bị admin ẩn",
    PRODUCT_SHOWN_BY_ADMIN: "Sản phẩm được admin mở lại",
    ORDER_REFUND_REQUESTED: "Yêu cầu hoàn tiền",
    ORDER_REFUND_REJECTED: "Hoàn tiền bị từ chối",
    WALLET_CREDITED: "Đã cộng ví",
    PAID_OUT: "Đã chi trả",
    SELLER_REVIEW: "Duyệt hồ sơ người bán",
    ACCOUNT_LOCKED: "Tài khoản bị khóa",
    ACCOUNT_UNLOCKED: "Tài khoản được mở khóa",
    GENERAL: "Thông báo hệ thống",
  };

  return labelMap[type] || String(type || "Thông báo").replace(/_/g, " ");
}

function getNotificationSortPriority(item) {
  return item.unread ? 0 : 1;
}

function getNotificationTimestamp(item) {
  return new Date(item.created_at || 0).getTime();
}

function SellerNotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");
      const response = await getNotifications({ audience: "seller" });
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
      const unreadIds = items.filter((item) => item.unread).map((item) => item.id);

      if (!unreadIds.length) {
        toast.success("Tất cả thông báo đã ở trạng thái đã đọc.");
        return;
      }

      await Promise.all(unreadIds.map((id) => markNotificationAsRead(id)));
      setItems((current) => current.map((item) => ({ ...item, unread: false })));
      toast.success("Đã đánh dấu đã đọc tất cả thông báo.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được thông báo.");
    }
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      const priorityDiff = getNotificationSortPriority(left) - getNotificationSortPriority(right);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return getNotificationTimestamp(right) - getNotificationTimestamp(left);
    });
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / NOTIFICATIONS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * NOTIFICATIONS_PER_PAGE;
    return sortedItems.slice(startIndex, startIndex + NOTIFICATIONS_PER_PAGE);
  }, [page, sortedItems]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(sortedItems.length / NOTIFICATIONS_PER_PAGE))));
  }, [sortedItems]);

  if (loading) {
    return (
      <EmptyState
        title="Đang tải thông báo"
        description="Hệ thống đang đọc thông báo của người bán từ backend."
      />
    );
  }

  if (error) {
    return <EmptyState title="Không tải được thông báo" description={error} />;
  }

  if (!items.length) {
    return (
      <EmptyState
        title="Chưa có thông báo"
        description="Khi có duyệt sản phẩm, xác nhận đơn hàng, hoàn tiền hoặc chi trả, thông báo sẽ hiển thị tại đây."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Thông báo"

        action={
          <Button variant="secondary" onClick={handleReadAll}>
            Đánh dấu đã đọc tất cả
          </Button>
        }
      />

      <div className="space-y-4">
        {paginatedItems.map((item) => (
          <div key={item.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.unread ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                  >
                    {item.unread ? "Chưa đọc" : "Đã đọc"}
                  </span>
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    {formatNotificationType(item.type)}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
              {item.unread ? (
                <Button variant="secondary" size="sm" onClick={() => handleRead(item.id)}>
                  Đánh dấu đã đọc
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {sortedItems.length > NOTIFICATIONS_PER_PAGE ? (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      ) : null}
    </div>
  );
}

export default SellerNotificationsPage;
