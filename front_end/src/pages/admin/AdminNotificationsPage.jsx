import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getNotifications, markNotificationAsRead } from "../../api/notificationApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapNotificationDto } from "../../lib/apiMappers";
import { formatDateTime } from "../../lib/format";

const NOTIFICATIONS_PER_PAGE = 8;

const notificationTypeLabels = {
  ADMIN_PENDING_SELLER: "Người bán chờ duyệt",
  ADMIN_PENDING_AFFILIATE: "Affiliate chờ duyệt",
  ADMIN_PENDING_PRODUCT: "Sản phẩm chờ duyệt",
  ADMIN_PENDING_AFFILIATE_SUBQUEUE: "Cấu hình affiliate chờ duyệt",
  ORDER_REFUND_REQUESTED: "Yêu cầu hoàn tiền",
  ORDER_REFUND_REJECTED: "Hoàn tiền bị từ chối",
  PLATFORM_FEE_CREDIT: "Ghi nhận phí nền tảng",
  PLATFORM_FEE_REVERSAL: "Đảo phí nền tảng",
};

function resolveAdminNotificationLink(item) {
  const targetId = item?.raw?.targetId || item?.raw?.target_id || null;

  if (item.type === "ADMIN_PENDING_SELLER" && targetId) {
    return `/admin/sellers/${targetId}`;
  }

  if (item.type === "ADMIN_PENDING_AFFILIATE" && targetId) {
    return `/admin/affiliates/${targetId}`;
  }

  if ((item.type === "ADMIN_PENDING_PRODUCT" || item.type === "ADMIN_PENDING_AFFILIATE_SUBQUEUE") && targetId) {
    return `/admin/products/${targetId}`;
  }

  if (!targetId) {
    return null;
  }

  if (item.type === "ORDER_REFUND_REQUESTED" || item.type === "ORDER_REFUND_REJECTED") {
    return `/admin/orders?orderId=${targetId}`;
  }

  if (item.type === "PLATFORM_FEE_CREDIT" || item.type === "PLATFORM_FEE_REVERSAL") {
    return `/admin/settings?orderId=${targetId}`;
  }

  return `/admin/orders?orderId=${targetId}`;
}

function formatNotificationType(type = "") {
  return notificationTypeLabels[type] || type || "--";
}

function getNotificationSortPriority(item) {
  return item.unread ? 0 : 1;
}

function getNotificationTimestamp(item) {
  return new Date(item.created_at || 0).getTime();
}

function AdminNotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      try {
        setLoading(true);
        setError("");
        const response = await getNotifications({ audience: "admin" });
        if (active) {
          setItems((response || []).map(mapNotificationDto));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được thông báo quản trị.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const unread = items.filter((item) => item.unread).length;
    const read = items.length - unread;
    return {
      total: items.length,
      unread,
      read,
    };
  }, [items]);

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
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
    return sortedItems.slice(startIndex, startIndex + NOTIFICATIONS_PER_PAGE);
  }, [currentPage, sortedItems]);

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

  if (loading) {
    return (
      <EmptyState
        title="Đang tải thông báo quản trị"
        description="Hệ thống đang đọc thông báo của admin từ backend."
      />
    );
  }

  if (error) {
    return <EmptyState title="Không tải được thông báo quản trị" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị"
        title="Thông báo"
        action={
          <Button variant="secondary" onClick={handleReadAll}>
            Đánh dấu đã đọc tất cả
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        <AdminStatCard label="Tổng thông báo" value={summary.total.toLocaleString("vi-VN")} tone="cyan" />
        <AdminStatCard label="Thông báo đã đọc" value={summary.read.toLocaleString("vi-VN")} tone="amber" />
      </div>

      {!items.length ? (
        <EmptyState
          title="Chưa có thông báo quản trị"
          description="Khi có sự kiện cần admin xử lý, thông báo sẽ hiển thị tại đây."
        />
      ) : (
        <>
          <div className="space-y-4">
            {paginatedItems.map((item) => (
              <div
                key={item.id}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_50px_rgba(2,6,23,0.18)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-4xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={item.unread ? "PENDING" : "APPROVED"} />
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
                        {formatNotificationType(item.type)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{item.description}</p>
                    {resolveAdminNotificationLink(item) ? (
                      <div className="mt-4">
                        <Link
                          to={resolveAdminNotificationLink(item)}
                          className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
                        >
                          Mở bản ghi liên quan
                        </Link>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      {formatDateTime(item.created_at)}
                    </p>
                    {item.unread ? (
                      <Button variant="secondary" size="sm" onClick={() => handleRead(item.id)}>
                        Đã đọc
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sortedItems.length > NOTIFICATIONS_PER_PAGE ? (
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </>
      )}
    </div>
  );
}

export default AdminNotificationsPage;
