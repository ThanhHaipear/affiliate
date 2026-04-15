import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminStatCard from "../../components/admin/AdminStatCard";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../../api/notificationApi";
import { mapNotificationDto } from "../../lib/apiMappers";
import { formatDateTime } from "../../lib/format";

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
    return `/admin/platform-fees?orderId=${targetId}`;
  }

  return `/admin/orders?orderId=${targetId}`;
}

function AdminNotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          setError(loadError.response?.data?.message || "Khong tai duoc thong bao admin.");
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
    const credited = items.filter((item) => item.type === "PLATFORM_FEE_CREDIT").length;
    const reversed = items.filter((item) => item.type === "PLATFORM_FEE_REVERSAL").length;

    return {
      total: items.length,
      unread,
      credited,
      reversed,
    };
  }, [items]);

  async function handleRead(id) {
    try {
      await markNotificationAsRead(id);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, unread: false } : item)));
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc thong bao.");
    }
  }

  async function handleReadAll() {
    try {
      await markAllNotificationsAsRead({ audience: "admin" });
      setItems((current) => current.map((item) => ({ ...item, unread: false })));
      toast.success("Da danh dau da doc toan bo thong bao admin.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc thong bao.");
    }
  }

  if (loading) {
    return <EmptyState title="Dang tai thong bao admin" description="He thong dang doc notification cua admin tu backend." />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc thong bao admin" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Admin notifications"
        description="Theo doi cac bien dong tai chinh cua nen tang, dac biet la phi nen tang da ghi nhan hoac bi dao but toan sau refund."
        action={<Button variant="secondary" onClick={handleReadAll}>Danh dau da doc tat ca</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Tong thong bao" value={summary.total.toLocaleString("vi-VN")} meta="Theo audience admin" tone="cyan" />
        <AdminStatCard label="Chua doc" value={summary.unread.toLocaleString("vi-VN")} meta="Can admin xu ly hoac doi chieu" tone="amber" />
        <AdminStatCard label="Phi da ghi nhan" value={summary.credited.toLocaleString("vi-VN")} meta="Platform fee credit events" tone="emerald" />
        <AdminStatCard label="Phi bi dao" value={summary.reversed.toLocaleString("vi-VN")} meta="Refund reversal events" tone="rose" />
      </div>

      {!items.length ? (
        <EmptyState
          title="Chua co thong bao admin"
          description="Khi co phi nen tang duoc ghi nhan hoac bi dao do refund, he thong se hien thong bao tai day."
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_50px_rgba(2,6,23,0.18)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={item.unread ? "PENDING" : "APPROVED"} />
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
                      {item.type}
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
                        Mo ban ghi lien quan
                      </Link>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{formatDateTime(item.created_at)}</p>
                  {item.unread ? (
                    <Button variant="secondary" size="sm" onClick={() => handleRead(item.id)}>
                      Da doc
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminNotificationsPage;
