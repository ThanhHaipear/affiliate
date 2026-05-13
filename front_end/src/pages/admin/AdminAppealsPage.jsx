import { useEffect, useMemo, useState } from "react";
import { getAdminAppeals, adminReplyAppeal } from "../../api/appealApi";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import FilterBar from "../../components/admin/FilterBar";
import Pagination from "../../components/common/Pagination";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/format";

const APPEALS_PER_PAGE = 5;

function AdminAppealsPage() {
  const toast = useToast();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedAppealId, setSelectedAppealId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyAction, setReplyAction] = useState("TEXT");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPage(1);
    loadAppeals();
  }, [statusFilter]);

  async function loadAppeals() {
    try {
      setLoading(true);
      setError("");
      const data = await getAdminAppeals({ status: statusFilter });
      setAppeals(data || []);
      if (data?.length && !selectedAppealId) {
        setSelectedAppealId(String(data[0].id));
      }
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được kiến nghị.");
    } finally {
      setLoading(false);
    }
  }

  const selectedAppeal = useMemo(
    () => appeals.find((a) => String(a.id) === String(selectedAppealId)) || appeals[0] || null,
    [appeals, selectedAppealId],
  );

  const paginatedAppeals = useMemo(() => {
    const startIndex = (page - 1) * APPEALS_PER_PAGE;
    return appeals.slice(startIndex, startIndex + APPEALS_PER_PAGE);
  }, [appeals, page]);

  function getAccountName(appeal) {
    if (!appeal?.account) return "N/A";
    const acc = appeal.account;
    if (acc.sellers?.[0]?.shopName) return acc.sellers[0].shopName;
    if (acc.affiliate?.fullName) return acc.affiliate.fullName;
    if (acc.customerProfile?.fullName) return acc.customerProfile.fullName;
    return acc.email || acc.phone || "N/A";
  }

  function getTargetLabel(appeal) {
    if (appeal.targetType === "PRODUCT") return `Sản phẩm #${appeal.targetId}`;
    if (appeal.targetType === "AFFILIATE_LINK") return `Link affiliate #${appeal.targetId}`;
    return `#${appeal.targetId}`;
  }

  async function handleReply() {
    if (!replyText.trim() || !selectedAppeal) return;

    try {
      setSubmitting(true);
      const updated = await adminReplyAppeal(selectedAppeal.id, {
        content: replyText.trim(),
        action: replyAction,
      });
      setAppeals((prev) =>
        prev.map((a) => (String(a.id) === String(updated.id) ? updated : a)),
      );
      setReplyText("");
      setReplyAction("TEXT");
      toast.success(
        replyAction === "UNLOCK"
          ? "Đã phản hồi và mở khóa thành công."
          : replyAction === "RESOLVE"
            ? "Đã đóng kiến nghị."
            : "Đã gửi phản hồi.",
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Không gửi được phản hồi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={6} cards={2} />;
  }

  if (error) {
    return <EmptyState title="Không tải được kiến nghị" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị"
        title="Kiến nghị từ Seller & Affiliate"
        description="Xem và phản hồi các kiến nghị khi sản phẩm bị ẩn hoặc link bị khóa."
      />

      <FilterBar
        filters={[
          {
            key: "status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "Tất cả", value: "ALL" },
              { label: "Đang mở", value: "OPEN" },
              { label: "Đã giải quyết", value: "RESOLVED" },
            ],
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.45fr_0.55fr]">
        {/* List */}
        <div className="space-y-3">
          {!paginatedAppeals.length ? (
            <EmptyState title="Không có kiến nghị" description="Chưa có kiến nghị nào phù hợp bộ lọc." />
          ) : (
            paginatedAppeals.map((appeal) => {
              const isSelected = String(appeal.id) === String(selectedAppealId);
              return (
                <button
                  key={String(appeal.id)}
                  type="button"
                  onClick={() => setSelectedAppealId(String(appeal.id))}
                  className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                    isSelected
                      ? "border-sky-300 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{getAccountName(appeal)}</p>
                      <p className="mt-1 text-xs text-slate-500">{getTargetLabel(appeal)}</p>
                    </div>
                    <StatusBadge status={appeal.status === "OPEN" ? "Đang mở" : "Đã giải quyết"} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(appeal.createdAt)}</p>
                  {appeal.messages?.length ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {appeal.messages[appeal.messages.length - 1].content}
                    </p>
                  ) : null}
                </button>
              );
            })
          )}
          {appeals.length > APPEALS_PER_PAGE && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(appeals.length / APPEALS_PER_PAGE)}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="space-y-4">
          {selectedAppeal ? (
            <>
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-sky-700">Chi tiết kiến nghị</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">{getTargetLabel(selectedAppeal)}</h3>
                  </div>
                  <StatusBadge status={selectedAppeal.status === "OPEN" ? "Đang mở" : "Đã giải quyết"} />
                </div>

                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  <p>Người gửi: {getAccountName(selectedAppeal)}</p>
                  <p>Email: {selectedAppeal.account?.email || "N/A"}</p>
                  <p>Loại: {selectedAppeal.targetType === "PRODUCT" ? "Sản phẩm" : "Link affiliate"}</p>
                  <p>Ngày gửi: {formatDateTime(selectedAppeal.createdAt)}</p>
                  {selectedAppeal.reviewer ? (
                    <p>Admin xử lý: {selectedAppeal.reviewer.adminProfile?.fullName || selectedAppeal.reviewer.email}</p>
                  ) : null}
                </div>
              </div>

              {/* Messages */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cuộc trò chuyện</p>
                <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                  {(selectedAppeal.messages || []).map((msg) => {
                    const isAdmin = msg.sender?.adminProfile;
                    const senderName = isAdmin
                      ? (msg.sender.adminProfile.fullName || "Admin")
                      : (msg.sender?.sellers?.[0]?.shopName || msg.sender?.affiliate?.fullName || msg.sender?.customerProfile?.fullName || msg.sender?.email || "Người dùng");
                    return (
                      <div
                        key={String(msg.id)}
                        className={`rounded-xl p-4 text-sm ${isAdmin ? "ml-8 bg-sky-50 text-sky-800" : "mr-8 bg-slate-50 text-slate-700"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">{senderName}</p>
                          <p className="text-xs text-slate-400">{formatDateTime(msg.createdAt)}</p>
                        </div>
                        <p className="mt-2 leading-6">{msg.content}</p>
                        {msg.action === "UNLOCK" ? (
                          <p className="mt-2 text-xs font-semibold text-emerald-600">✓ Đã mở khóa</p>
                        ) : null}
                        {msg.action === "RESOLVE" ? (
                          <p className="mt-2 text-xs font-semibold text-slate-500">✓ Đã đóng kiến nghị</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Reply form */}
                {selectedAppeal.status === "OPEN" ? (
                  <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Nhập phản hồi cho kiến nghị..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={replyAction}
                        onChange={(e) => setReplyAction(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none"
                      >
                        <option value="TEXT">Phản hồi text</option>
                        <option value="UNLOCK">Phản hồi + Mở khóa</option>
                        <option value="RESOLVE">Đóng kiến nghị</option>
                      </select>
                      <Button
                        onClick={handleReply}
                        loading={submitting}
                        disabled={!replyText.trim()}
                        variant={replyAction === "UNLOCK" ? "primary" : replyAction === "RESOLVE" ? "secondary" : "primary"}
                      >
                        {replyAction === "UNLOCK"
                          ? "Gửi phản hồi & Mở khóa"
                          : replyAction === "RESOLVE"
                            ? "Gửi & Đóng kiến nghị"
                            : "Gửi phản hồi"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-medium text-emerald-600">✓ Kiến nghị đã được giải quyết.</p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AdminAppealsPage;
