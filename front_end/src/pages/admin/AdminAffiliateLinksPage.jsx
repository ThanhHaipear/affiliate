import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getAdminAffiliateLinks,
  revokeAdminAffiliateLink,
  unrevokeAdminAffiliateLink,
} from "../../api/adminApi";
import FilterBar from "../../components/admin/FilterBar";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminAffiliateLinkDto } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

const LINKS_PER_PAGE = 8;

function AdminAffiliateLinksPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [submittingId, setSubmittingId] = useState("");
  const [page, setPage] = useState(1);
  const requestedLinkId = searchParams.get("linkId");

  useEffect(() => {
    let active = true;

    async function loadLinks() {
      try {
        setLoading(true);
        setError("");
        const response = await getAdminAffiliateLinks();
        if (active) {
          const mapped = (response || []).map(mapAdminAffiliateLinkDto);
          const initialLink =
            (requestedLinkId && mapped.find((item) => String(item.id) === String(requestedLinkId))) ||
            mapped[0] ||
            null;
          setLinks(mapped);
          setSelectedLinkId(initialLink ? String(initialLink.id) : null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được danh sách link affiliate.");
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
  }, [requestedLinkId]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filteredLinks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return links.filter((link) => {
      const matchesSearch =
        !normalizedSearch ||
        [link.shortCode, link.affiliateName, link.affiliateEmail, link.productName, link.shopName]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesStatus = statusFilter === "ALL" || link.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [links, search, statusFilter]);

  useEffect(() => {
    if (!filteredLinks.length) {
      setSelectedLinkId(null);
      return;
    }

    if (!filteredLinks.some((item) => String(item.id) === String(selectedLinkId))) {
      setSelectedLinkId(String(filteredLinks[0].id));
    }
  }, [filteredLinks, selectedLinkId]);

  useEffect(() => {
    if (!requestedLinkId) {
      return;
    }

    const matchedLink = links.find((item) => String(item.id) === String(requestedLinkId));
    if (matchedLink) {
      setSelectedLinkId(String(matchedLink.id));
    }
  }, [links, requestedLinkId]);

  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / LINKS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLinks = useMemo(() => {
    const startIndex = (currentPage - 1) * LINKS_PER_PAGE;
    return filteredLinks.slice(startIndex, startIndex + LINKS_PER_PAGE);
  }, [currentPage, filteredLinks]);

  const selectedLink = useMemo(
    () => filteredLinks.find((item) => String(item.id) === String(selectedLinkId)) || filteredLinks[0] || null,
    [filteredLinks, selectedLinkId],
  );

  const summary = useMemo(() => {
    return filteredLinks.reduce(
      (result, link) => {
        result.total += 1;
        if (link.status === "REVOKED") {
          result.revoked += 1;
        }
        return result;
      },
      { total: 0, revoked: 0 },
    );
  }, [filteredLinks]);

  function syncSelectedLink(linkId) {
    setSelectedLinkId(String(linkId));
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set("linkId", String(linkId));
      return nextParams;
    });
  }

  async function handleRevokeLink(link) {
    if (link.status === "REVOKED") {
      toast.error("Link này đã bị vô hiệu hóa.");
      return;
    }

    const shouldRevoke = window.confirm(
      `Admin sẽ vô hiệu hóa link ${link.shortCode}. Sau khi khóa, affiliate sẽ không dùng được link này và không tự mở lại nếu link bị admin khóa.`,
    );

    if (!shouldRevoke) {
      return;
    }

    try {
      setSubmittingId(String(link.id));
      const revoked = await revokeAdminAffiliateLink(link.id);
      const mapped = mapAdminAffiliateLinkDto(revoked);
      setLinks((current) => current.map((item) => (String(item.id) === String(link.id) ? mapped : item)));
      syncSelectedLink(link.id);
      toast.success("Đã khóa link affiliate.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không khóa được link affiliate.");
    } finally {
      setSubmittingId("");
    }
  }

  async function handleUnrevokeLink(link) {
    if (link.status !== "REVOKED") {
      toast.error("Link này đang hoạt động.");
      return;
    }

    const shouldUnrevoke = window.confirm(
      `Admin sẽ mở khóa link ${link.shortCode}. Sau khi mở khóa, link sẽ có hiệu lực trở lại và tiếp tục ghi nhận click mới.`,
    );

    if (!shouldUnrevoke) {
      return;
    }

    try {
      setSubmittingId(String(link.id));
      const restored = await unrevokeAdminAffiliateLink(link.id);
      const mapped = mapAdminAffiliateLinkDto(restored);
      setLinks((current) => current.map((item) => (String(item.id) === String(link.id) ? mapped : item)));
      syncSelectedLink(link.id);
      toast.success("Đã mở khóa link affiliate.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không mở khóa được link affiliate.");
    } finally {
      setSubmittingId("");
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={6} cards={4} />;
  }

  if (error) {
    return <EmptyState title="Không tải được link affiliate" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Link affiliate"
        title="Link của affiliate"
        description={
          requestedLinkId
            ? "Trang này đang mở trực tiếp từ cảnh báo gian lận. Admin có thể xem đúng link đang bị cảnh báo và khóa ngay tại đây."
            : " "
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        <SummaryCard label="Tổng link" value={summary.total} />
        <SummaryCard label="Đã khóa" value={summary.revoked} />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo mã link, affiliate, email, sản phẩm hoặc shop"
        filters={[
          {
            key: "status",

            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "Tất cả", value: "ALL" },
              { label: "Đang hoạt động", value: "ACTIVE" },
              { label: "Đã thu hồi", value: "REVOKED" },
            ],
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-4">
          <DataTable
            columns={[
              { key: "shortCode", title: "Mã link" },
              { key: "affiliateName", title: "Affiliate" },
              { key: "productName", title: "Sản phẩm" },
              { key: "shopName", title: "Shop" },
              { key: "clickCount", title: "Click" },
              { key: "orderCount", title: "Đơn" },
              {
                key: "status",
                title: "Trạng thái",
                render: (row) => <StatusBadge status={row.statusDisplay} />,
              },
              {
                key: "actions",
                title: "Tác vụ",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => syncSelectedLink(row.id)}>
                      Xem
                    </Button>
                    {row.status === "REVOKED" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={submittingId === String(row.id)}
                        onClick={() => handleUnrevokeLink(row)}
                      >
                        Mở khóa
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={submittingId === String(row.id)}
                        onClick={() => handleRevokeLink(row)}
                      >
                        Khóa link
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={paginatedLinks}
            keyField="id"
            emptyTitle="Không có link affiliate"
            emptyDescription="Không có link affiliate nào khớp với bộ lọc hiện tại."
          />

          {filteredLinks.length > LINKS_PER_PAGE ? (
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </div>

        <div className="space-y-6">
          {selectedLink ? (
            <>
              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  <img
                    src={selectedLink.productImage}
                    alt={selectedLink.productName}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-sky-700">Chi tiết link</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedLink.shortCode}</h3>
                    </div>
                    <StatusBadge status={selectedLink.statusDisplay} />
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Affiliate: {selectedLink.affiliateName}</p>
                    <p>Email: {selectedLink.affiliateEmail}</p>
                    <p>Sản phẩm: {selectedLink.productName}</p>
                    <p>Shop: {selectedLink.shopName}</p>
                    <p>
                      Click: {selectedLink.clickCount} | Đơn: {selectedLink.orderCount}
                    </p>
                    <p>Hoa hồng: {selectedLink.commissionValue}%</p>
                    <p>Tồn kho hiện tại: {selectedLink.stock}</p>
                    <p>Ngày tạo: {formatDateTime(selectedLink.createdAt)}</p>
                    {selectedLink.revokedAt ? <p>Ngày khóa: {formatDateTime(selectedLink.revokedAt)}</p> : null}
                    {selectedLink.status === "REVOKED" ? <p>Khóa bởi: {selectedLink.revokedByLabel}</p> : null}
                  </div>

                  {requestedLinkId && String(selectedLink.id) === String(requestedLinkId) ? (
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                      Link này được mở trực tiếp từ cảnh báo gian lận để admin có thể review và khóa ngay.
                    </div>
                  ) : null}

                  {selectedLink.status === "REVOKED" ? (
                    <div className="rounded-[1.5rem] bg-rose-50 p-4 text-sm leading-7 text-rose-700">
                      Link này đã bị vô hiệu hóa. Khi admin khóa link, affiliate sẽ không thể tự tạo lại để mở lại
                      link này.
                    </div>
                  ) : null}

                  {selectedLink.status === "REVOKED" ? (
                    <Button
                      variant="secondary"
                      loading={submittingId === String(selectedLink.id)}
                      onClick={() => handleUnrevokeLink(selectedLink)}
                    >
                      Mở khóa link này
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      loading={submittingId === String(selectedLink.id)}
                      onClick={() => handleRevokeLink(selectedLink)}
                    >
                      Khóa link này
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Nguyên tắc quyền</h3>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <p>Affiliate có thể tự khóa link của mình, và link sẽ vô hiệu hóa ngay.</p>
                  <p>Admin có thể khóa link của bất kỳ affiliate nào trong hệ thống.</p>
                  <p>Admin cũng có thể mở khóa lại link đã bị khóa để khôi phục hiệu lực tiếp thị.</p>
                  <p>
                    Nếu admin đã khóa link, affiliate không được phép mở lại bằng thao tác tạo link mới. Quyền admin
                    cao hơn affiliate.
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-[2rem] border border-slate-300 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{Number(value || 0).toLocaleString("vi-VN")}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default AdminAffiliateLinksPage;
