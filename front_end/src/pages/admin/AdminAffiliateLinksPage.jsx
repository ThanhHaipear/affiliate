import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAdminAffiliateLinks, revokeAdminAffiliateLink, unrevokeAdminAffiliateLink } from "../../api/adminApi";
import FilterBar from "../../components/admin/FilterBar";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminAffiliateLinkDto } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

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
            (requestedLinkId && mapped.find((item) => String(item.id) === String(requestedLinkId))) || mapped[0] || null;
          setLinks(mapped);
          setSelectedLinkId(initialLink ? String(initialLink.id) : null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Khong tai duoc danh sach affiliate link.");
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

  const filteredLinks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return links.filter((link) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          link.shortCode,
          link.affiliateName,
          link.affiliateEmail,
          link.productName,
          link.shopName,
        ].join(" ").toLowerCase().includes(normalizedSearch);
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

  const selectedLink = useMemo(
    () => filteredLinks.find((item) => String(item.id) === String(selectedLinkId)) || filteredLinks[0] || null,
    [filteredLinks, selectedLinkId],
  );

  const summary = useMemo(() => {
    return filteredLinks.reduce(
      (result, link) => {
        result.total += 1;
        result.clicks += link.clickCount;
        result.orders += link.orderCount;
        if (link.status === "REVOKED") {
          result.revoked += 1;
        }
        return result;
      },
      { total: 0, clicks: 0, orders: 0, revoked: 0 },
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
      toast.error("Link nay da bi vo hieu hoa.");
      return;
    }

    const shouldRevoke = window.confirm(
      `Admin se vo hieu hoa link ${link.shortCode}. Sau khi khoa, affiliate se khong dung duoc link nay va khong tu mo lai neu link bi admin khoa.`,
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
      toast.success("Da khoa affiliate link.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong khoa duoc affiliate link.");
    } finally {
      setSubmittingId("");
    }
  }

  async function handleUnrevokeLink(link) {
    if (link.status !== "REVOKED") {
      toast.error("Link nay dang hoat dong.");
      return;
    }

    const shouldUnrevoke = window.confirm(
      `Admin se mo khoa link ${link.shortCode}. Sau khi mo khoa, link se co hieu luc tro lai va tiep tuc ghi nhan click moi.`,
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
      toast.success("Da mo khoa affiliate link.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong mo khoa duoc affiliate link.");
    } finally {
      setSubmittingId("");
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={6} cards={4} />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc affiliate link" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate links"
        title="Quan ly link cua affiliate"
        description={
          requestedLinkId
            ? "Trang nay dang mo truc tiep tu canh bao fraud alert. Admin co the xem dung link dang bi canh bao va khoa ngay tai day."
            : "Admin co the xem link tiep thi cua tung tai khoan affiliate va khoa link bat ky. Link bi admin khoa se vo hieu hoa va affiliate khong tu mo lai duoc."
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tong link" value={summary.total} hint="Theo bo loc hien tai" />
        <SummaryCard label="Tong click" value={summary.clicks} hint="Cong tu toan bo link dang loc" />
        <SummaryCard label="Tong don" value={summary.orders} hint="Cong tu order attribution" />
        <SummaryCard label="Da khoa" value={summary.revoked} hint="Trang thai REVOKED" />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tim theo ma link, affiliate, email, san pham hoac shop"
        filters={[
          {
            key: "status",
            label: "Trang thai",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "Tat ca", value: "ALL" },
              { label: "ACTIVE", value: "ACTIVE" },
              { label: "REVOKED", value: "REVOKED" },
            ],
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <DataTable
          columns={[
            { key: "shortCode", title: "Ma link" },
            { key: "affiliateName", title: "Affiliate" },
            { key: "productName", title: "San pham" },
            { key: "shopName", title: "Shop" },
            { key: "clickCount", title: "Click" },
            { key: "orderCount", title: "Don" },
            { key: "status", title: "Trang thai", render: (row) => <StatusBadge status={row.statusDisplay} /> },
            {
              key: "actions",
              title: "Tac vu",
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
                      Mo khoa
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={submittingId === String(row.id)}
                      onClick={() => handleRevokeLink(row)}
                    >
                      Khoa link
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={filteredLinks}
          keyField="id"
          emptyTitle="Khong co affiliate link"
          emptyDescription="Khong co affiliate link nao khop voi bo loc hien tai."
        />

        <div className="space-y-6">
          {selectedLink ? (
            <>
              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  <img src={selectedLink.productImage} alt={selectedLink.productName} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-sky-700">Link chi tiet</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedLink.shortCode}</h3>
                    </div>
                    <StatusBadge status={selectedLink.statusDisplay} />
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Affiliate: {selectedLink.affiliateName}</p>
                    <p>Email: {selectedLink.affiliateEmail}</p>
                    <p>San pham: {selectedLink.productName}</p>
                    <p>Shop: {selectedLink.shopName}</p>
                    <p>Click: {selectedLink.clickCount} | Don: {selectedLink.orderCount}</p>
                    <p>Hoa hong: {selectedLink.commissionValue}%</p>
                    <p>Ton kho hien tai: {selectedLink.stock}</p>
                    <p>Ngay tao: {formatDateTime(selectedLink.createdAt)}</p>
                    {selectedLink.revokedAt ? <p>Ngay khoa: {formatDateTime(selectedLink.revokedAt)}</p> : null}
                    {selectedLink.status === "REVOKED" ? <p>Khoa boi: {selectedLink.revokedByLabel}</p> : null}
                  </div>
                  {requestedLinkId && String(selectedLink.id) === String(requestedLinkId) ? (
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                      Link nay duoc mo truc tiep tu canh bao fraud alert de admin co the review va khoa ngay.
                    </div>
                  ) : null}
                  {selectedLink.status === "REVOKED" ? (
                    <div className="rounded-[1.5rem] bg-rose-50 p-4 text-sm leading-7 text-rose-700">
                      Link nay da bi vo hieu hoa. Khi admin khoa link, affiliate se khong the tu tao lai de mo lai link nay.
                    </div>
                  ) : null}
                  {selectedLink.status === "REVOKED" ? (
                    <Button
                      variant="secondary"
                      loading={submittingId === String(selectedLink.id)}
                      onClick={() => handleUnrevokeLink(selectedLink)}
                    >
                      Mo khoa link nay
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      loading={submittingId === String(selectedLink.id)}
                      onClick={() => handleRevokeLink(selectedLink)}
                    >
                      Khoa link nay
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Nguyen tac quyen</h3>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <p>Affiliate co the tu khoa link cua minh, va link se vo hieu hoa ngay.</p>
                  <p>Admin co the khoa link cua bat ky affiliate nao trong he thong.</p>
                  <p>Admin cung co the mo khoa lai link da bi khoa de khoi phuc hieu luc tiep thi.</p>
                  <p>Neu admin da khoa link, affiliate khong duoc phep mo lai bang thao tac tao link moi. Quyen admin cao hon affiliate.</p>
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
