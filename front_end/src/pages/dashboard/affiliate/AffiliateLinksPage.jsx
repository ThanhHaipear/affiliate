import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAffiliateLinks, revokeAffiliateLink, unrevokeAffiliateLink } from "../../../api/affiliateApi";
import Button from "../../../components/common/Button";
import CopyBox from "../../../components/common/CopyBox";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatCurrency, formatDateTime } from "../../../lib/format";
import { mapAffiliateLinkDto } from "../../../lib/apiMappers";
import { copyText } from "../../../lib/clipboard";
import { useAuthStore } from "../../../store/authStore";

const LINKS_PER_PAGE = 8;

function AffiliateLinksPage() {
  const toast = useToast();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [links, setLinks] = useState([]);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [revokingLinkId, setRevokingLinkId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadLinks() {
      try {
        setLoading(true);
        setError("");
        const response = await getAffiliateLinks();
        if (active) {
          setLinks((response || []).map(mapAffiliateLinkDto));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được danh sách affiliate link.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLinks();
    return () => {
      active = false;
    };
  }, []);

  const filteredLinks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return links.filter((link) => {
      const canDisplayInAffiliateDashboard =
        Number(link.product_stock || 0) > 0 &&
        link.product_visibility_status === "ACTIVE" &&
        link.product_approval_status === "APPROVED" &&
        link.affiliate_enabled &&
        link.affiliate_setting_status === "APPROVED";

      if (!canDisplayInAffiliateDashboard) {
        return false;
      }

      const matchesSearch =
        !normalizedSearch ||
        [link.short_code, link.product_name, link.shop_name].join(" ").toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === "ALL" || link.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [links, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, links.length]);

  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / LINKS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLinks = useMemo(() => {
    const startIndex = (currentPage - 1) * LINKS_PER_PAGE;
    return filteredLinks.slice(startIndex, startIndex + LINKS_PER_PAGE);
  }, [currentPage, filteredLinks]);

  useEffect(() => {
    if (!paginatedLinks.length) {
      setSelectedLinkId(null);
      return;
    }

    if (!paginatedLinks.some((item) => String(item.id) === String(selectedLinkId))) {
      setSelectedLinkId(paginatedLinks[0].id);
    }
  }, [paginatedLinks, selectedLinkId]);

  const selectedLink = useMemo(
    () => paginatedLinks.find((item) => String(item.id) === String(selectedLinkId)) || paginatedLinks[0] || null,
    [paginatedLinks, selectedLinkId],
  );

  const summary = useMemo(() => {
    return filteredLinks.reduce(
      (result, link) => {
        result.total += 1;
        if (link.status === "ACTIVE") {
          result.active += 1;
        }
        if (link.status === "REVOKED") {
          result.revoked += 1;
        }
        return result;
      },
      { total: 0, active: 0, revoked: 0 },
    );
  }, [filteredLinks]);

  const accountLabel =
    currentUser?.profile?.fullName ||
    currentUser?.email ||
    currentUser?.phone ||
    `Affiliate #${currentUser?.id || ""}`;

  const selectedUrl = selectedLink
    ? `${window.location.origin}/products/${selectedLink.product_id}?ref=${selectedLink.short_code}`
    : "";

  async function handleQuickCopy(link) {
    if (link.status === "REVOKED") {
      toast.error("Link này đã bị vô hiệu hóa, không thể tiếp tục sao chép để tiếp thị.");
      return;
    }

    const url = `${window.location.origin}/products/${link.product_id}?ref=${link.short_code}`;
    try {
      const copied = await copyText(url);
      if (!copied) {
        throw new Error("COPY_FAILED");
      }

      setSelectedLinkId(link.id);
      toast.success("Đã sao chép link đang chọn.");
    } catch {
      toast.error("Không sao chép được link.");
    }
  }

  async function handleRevokeLink(link) {
    if (link.status === "REVOKED") {
      toast.error("Link này đã bị vô hiệu hóa trước đó.");
      return;
    }

    const shouldRevoke = window.confirm(
      `Bạn có chắc muốn khóa link ${link.short_code}? Link bị khóa sẽ không tiếp tục ghi nhận click mới.`,
    );
    if (!shouldRevoke) {
      return;
    }

    try {
      setRevokingLinkId(link.id);
      const revokedLink = await revokeAffiliateLink(link.id);
      const mappedRevokedLink = mapAffiliateLinkDto({
        ...(link.raw || {}),
        ...revokedLink,
        product: link.raw?.product,
        clicks: link.raw?.clicks,
        orderItems: link.raw?.orderItems,
      });

      setLinks((currentLinks) =>
        currentLinks.map((item) =>
          String(item.id) === String(link.id)
            ? { ...item, ...mappedRevokedLink, raw: { ...(item.raw || {}), ...revokedLink } }
            : item,
        ),
      );
      setSelectedLinkId(link.id);
      toast.success("Đã khóa link tiếp thị.");
    } catch (revokeError) {
      toast.error(revokeError.response?.data?.message || "Không khóa được link tiếp thị.");
    } finally {
      setRevokingLinkId(null);
    }
  }

  async function handleUnrevokeLink(link) {
    if (link.status !== "REVOKED") {
      toast.error("Link này đang hoạt động.");
      return;
    }

    if (link.revoked_by_admin) {
      toast.error("Link do admin khóa không thể tự mở lại. Hãy liên hệ admin.");
      return;
    }

    try {
      setRevokingLinkId(link.id);
      const restoredLink = await unrevokeAffiliateLink(link.id);
      const mappedRestoredLink = mapAffiliateLinkDto({
        ...(link.raw || {}),
        ...restoredLink,
        product: restoredLink?.product || link.raw?.product,
        clicks: restoredLink?.clicks || link.raw?.clicks,
        orderItems: restoredLink?.orderItems || link.raw?.orderItems,
      });

      setLinks((currentLinks) =>
        currentLinks.map((item) =>
          String(item.id) === String(link.id)
            ? { ...item, ...mappedRestoredLink, raw: { ...(item.raw || {}), ...restoredLink } }
            : item,
        ),
      );
      setSelectedLinkId(link.id);
      toast.success("Đã mở khóa link tiếp thị.");
    } catch (restoreError) {
      toast.error(restoreError.response?.data?.message || "Không mở khóa được link tiếp thị.");
    } finally {
      setRevokingLinkId(null);
    }
  }

  const displayStart = paginatedLinks.length ? (currentPage - 1) * LINKS_PER_PAGE + 1 : 0;
  const displayEnd = paginatedLinks.length ? Math.min(currentPage * LINKS_PER_PAGE, filteredLinks.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate"
        title="Quản lý link của tôi"

        action={(
          <Link to="/dashboard/affiliate/marketplace">
            <Button>Tạo link mới</Button>
          </Link>
        )}
      />

      {loading ? <EmptyState title="Đang tải affiliate link" description="Hệ thống đang đọc tracking link từ database." /> : null}
      {!loading && error ? <EmptyState title="Không tải được affiliate link" description={error} /> : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard label="Tổng link" value={summary.total} />
            <SummaryCard label="Link đang hoạt động" value={summary.active} />
            <SummaryCard label="Link đang bị khóa" value={summary.revoked} />
          </div>

          <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_240px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã link, tên sản phẩm hoặc shop"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="REVOKED">Bị khóa</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span>Có {filteredLinks.length} link phù hợp với bộ lọc hiện tại.</span>
            <span>
              Hiển thị {displayStart}-{displayEnd} / {filteredLinks.length}
            </span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[2rem] border border-slate-300 bg-white shadow-sm">
                {!filteredLinks.length ? (
                  <EmptyState
                    title="Không có link đang hiển thị"
                    description="Các link có sản phẩm hết hàng, bị ẩn hoặc không còn đủ điều kiện tiếp thị sẽ tự động ẩn khỏi giao diện này."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          {[
                            "Mã link",
                            "Sản phẩm",
                            "Shop",
                            "Click",
                            "Đơn",
                            "Trạng thái",
                            "Ngày tạo",
                            "Tác vụ",
                          ].map((title) => (
                            <th key={title} className="px-4 py-4 text-left text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                              {title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedLinks.map((link) => {
                          const isSelected = String(link.id) === String(selectedLinkId);
                          const isRevoked = link.status === "REVOKED";
                          return (
                            <tr
                              key={link.id}
                              className={`align-top transition ${isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"}`}
                            >
                              <td className="px-4 py-4 text-sm text-slate-700">
                                <button
                                  type="button"
                                  className="font-medium text-slate-900 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                                  onClick={() => setSelectedLinkId(link.id)}
                                >
                                  {link.short_code}
                                </button>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-700">{link.product_name}</td>
                              <td className="px-4 py-4 text-sm text-slate-700">{link.shop_name}</td>
                              <td className="px-4 py-4 text-sm text-slate-700">{link.click_count}</td>
                              <td className="px-4 py-4 text-sm text-slate-700">{link.order_count}</td>
                              <td className="px-4 py-4 text-sm text-slate-700"><StatusBadge status={link.status_display} /></td>
                              <td className="px-4 py-4 text-sm text-slate-700">{formatDateTime(link.created_at)}</td>
                              <td className="px-4 py-4 text-sm text-slate-700">
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => setSelectedLinkId(link.id)}>
                                    Xem link
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleQuickCopy(link)} disabled={isRevoked}>
                                    Sao chép
                                  </Button>
                                  {isRevoked ? (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleUnrevokeLink(link)}
                                      disabled={link.revoked_by_admin || revokingLinkId === link.id}
                                    >
                                      {revokingLinkId === link.id ? "Đang mở..." : "Mở khóa"}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() => handleRevokeLink(link)}
                                      disabled={revokingLinkId === link.id}
                                    >
                                      {revokingLinkId === link.id ? "Đang khóa..." : "Khóa link"}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {filteredLinks.length > LINKS_PER_PAGE ? (
                <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
              ) : null}
            </div>

            <div className="space-y-6">
              {selectedLink ? (
                <>
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Link đang chọn</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">Chọn từng dòng trong bảng bên trái để xem và sao chép link đầy đủ của sản phẩm đó.</p>
                      </div>
                      <StatusBadge status={selectedLink.status_display} />
                    </div>
                    <div className="mt-5 space-y-3">
                      <p className="text-sm font-medium text-slate-900">{selectedLink.product_name}</p>
                      <p className="text-sm text-slate-600">Shop: {selectedLink.shop_name}</p>
                      <p className="text-sm text-slate-600">
                        Click: {Number(selectedLink.click_count || 0).toLocaleString("vi-VN")} | Đơn: {Number(selectedLink.order_count || 0).toLocaleString("vi-VN")}
                      </p>
                      <p className="text-sm text-slate-600">Mã link: {selectedLink.short_code}</p>
                      {selectedLink.status === "REVOKED" ? (
                        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {selectedLink.revoked_by_admin
                            ? "Link này đã bị admin vô hiệu hóa. Affiliate không thể tự mở lại link này."
                            : "Link này đã bị vô hiệu hóa. Hệ thống sẽ không ghi nhận click mới từ link này nữa."}
                        </p>
                      ) : null}
                      {selectedLink.status === "REVOKED" && selectedLink.revoked_by_label ? (
                        <p className="text-sm text-slate-600">Khóa bởi: {selectedLink.revoked_by_label}</p>
                      ) : null}
                    </div>
                    <div className="mt-5">
                      <CopyBox
                        value={selectedUrl}
                        label="URL đầy đủ để sao chép"
                        actions={
                          selectedLink.status === "REVOKED" ? (
                            <Button
                              variant="secondary"
                              onClick={() => handleUnrevokeLink(selectedLink)}
                              disabled={selectedLink.revoked_by_admin || revokingLinkId === selectedLink.id}
                            >
                              {revokingLinkId === selectedLink.id ? "Đang mở..." : "Mở khóa link này"}
                            </Button>
                          ) : (
                            <Button
                              variant="danger"
                              onClick={() => handleRevokeLink(selectedLink)}
                              disabled={revokingLinkId === selectedLink.id}
                            >
                              {revokingLinkId === selectedLink.id ? "Đang khóa..." : "Khóa link này"}
                            </Button>
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                      <img src={selectedLink.product_image} alt={selectedLink.product_name} className="h-full w-full object-cover" />
                    </div>
                    <div className="space-y-4 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-sky-700">Chi tiết sản phẩm</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedLink.product_name}</h3>
                        </div>
                        <StatusBadge status={selectedLink.status_display} />
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1">{selectedLink.product_category || "Chung"}</span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                          Tồn kho: {Number(selectedLink.product_stock || 0).toLocaleString("vi-VN")}
                        </span>
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                          Hoa hồng: {selectedLink.commission_value}%
                        </span>
                      </div>
                      <p className="text-2xl font-semibold tabular-nums text-slate-900">{formatCurrency(selectedLink.product_price)}</p>
                      <p className="text-sm leading-7 text-slate-600">
                        {selectedLink.product_description || "Sản phẩm này chưa có mô tả chi tiết trong hệ thống."}
                      </p>
                      <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        <p>Shop: {selectedLink.shop_name}</p>
                        <p>Mã link: {selectedLink.short_code}</p>
                        <p>
                          Click: {Number(selectedLink.click_count || 0).toLocaleString("vi-VN")} | Đơn: {Number(selectedLink.order_count || 0).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link to={`/products/${selectedLink.product_id}`}>
                          <Button variant="secondary">Xem trang sản phẩm</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}


            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{Number(value || 0).toLocaleString("vi-VN")}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default AffiliateLinksPage;
