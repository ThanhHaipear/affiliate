import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAffiliateLinks, revokeAffiliateLink, unrevokeAffiliateLink } from "../../../api/affiliateApi";
import Button from "../../../components/common/Button";
import CopyBox from "../../../components/common/CopyBox";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatCurrency, formatDateTime } from "../../../lib/format";
import { mapAffiliateLinkDto } from "../../../lib/apiMappers";
import { copyText } from "../../../lib/clipboard";
import { useAuthStore } from "../../../store/authStore";

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

  useEffect(() => {
    let active = true;

    async function loadLinks() {
      try {
        setLoading(true);
        setError("");
        const response = await getAffiliateLinks();
        if (active) {
          const mapped = (response || []).map(mapAffiliateLinkDto);
          setLinks(mapped);
          setSelectedLinkId(mapped[0]?.id || null);
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
    if (!filteredLinks.length) {
      setSelectedLinkId(null);
      return;
    }

    if (!filteredLinks.some((item) => String(item.id) === String(selectedLinkId))) {
      setSelectedLinkId(filteredLinks[0].id);
    }
  }, [filteredLinks, selectedLinkId]);

  const selectedLink = useMemo(() => {
    return filteredLinks.find((item) => String(item.id) === String(selectedLinkId)) || filteredLinks[0] || null;
  }, [filteredLinks, selectedLinkId]);

  const summary = useMemo(() => {
    return filteredLinks.reduce(
      (result, link) => {
        result.total += 1;
        result.clicks += Number(link.click_count || 0);
        result.orders += Number(link.order_count || 0);
        if (link.status === "ACTIVE") {
          result.active += 1;
        }
        return result;
      },
      { total: 0, active: 0, clicks: 0, orders: 0 },
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
      toast.error("Link nay da bi vo hieu hoa, khong the tiep tuc copy de tiep thi.");
      return;
    }

    const url = `${window.location.origin}/products/${link.product_id}?ref=${link.short_code}`;
    try {
      const copied = await copyText(url);
      if (!copied) {
        throw new Error("COPY_FAILED");
      }

      setSelectedLinkId(link.id);
      toast.success("Da sao chep link dang chon.");
    } catch {
      toast.error("Khong sao chep duoc link.");
    }
  }

  async function handleRevokeLink(link) {
    if (link.status === "REVOKED") {
      toast.error("Link nay da bi vo hieu hoa truoc do.");
      return;
    }

    const shouldRevoke = window.confirm(`Ban co chac muon khoa link ${link.short_code}? Link bi khoa se khong tiep tuc ghi nhan click moi.`);
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

      setLinks((currentLinks) => currentLinks.map((item) => (
        String(item.id) === String(link.id)
          ? { ...item, ...mappedRevokedLink, raw: { ...(item.raw || {}), ...revokedLink } }
          : item
      )));
      setSelectedLinkId(link.id);
      toast.success("Da khoa link tiep thi.");
    } catch (revokeError) {
      toast.error(revokeError.response?.data?.message || "Khong khoa duoc link tiep thi.");
    } finally {
      setRevokingLinkId(null);
    }
  }

  async function handleUnrevokeLink(link) {
    if (link.status !== "REVOKED") {
      toast.error("Link nay dang hoat dong.");
      return;
    }

    if (link.revoked_by_admin) {
      toast.error("Link do admin khoa khong the tu mo lai. Hay lien he admin.");
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

      setLinks((currentLinks) => currentLinks.map((item) => (
        String(item.id) === String(link.id)
          ? { ...item, ...mappedRestoredLink, raw: { ...(item.raw || {}), ...restoredLink } }
          : item
      )));
      setSelectedLinkId(link.id);
      toast.success("Da mo khoa link tiep thi.");
    } catch (restoreError) {
      toast.error(restoreError.response?.data?.message || "Khong mo khoa duoc link tiep thi.");
    } finally {
      setRevokingLinkId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate"
        title="Quan ly link tiep thi cua toi"
        description={`Trang nay chi hien thi link cua tai khoan affiliate hien tai: ${accountLabel}. Ban co the loc, copy, xem chi tiet va khoa tung link rieng. Neu admin khoa link, affiliate khong the tu mo lai.`}
        action={(
          <Link to="/dashboard/affiliate/marketplace">
            <Button>Tao link moi</Button>
          </Link>
        )}
      />
      {loading ? <EmptyState title="Dang tai affiliate link" description="He thong dang doc tracking link tu database." /> : null}
      {!loading && error ? <EmptyState title="Khong tai duoc affiliate link" description={error} /> : null}
      {!loading && !error ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Tong link" value={summary.total} hint="Theo tai khoan affiliate hien tai" />
            <SummaryCard label="Link dang hoat dong" value={summary.active} hint="Trang thai ACTIVE" />
            <SummaryCard label="Tong click" value={summary.clicks} hint="Cong tu toan bo link dang loc" />
            <SummaryCard label="Tong don" value={summary.orders} hint="Cong tu tracking order items" />
          </div>

          <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_240px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tim theo ma link, ten san pham hoac shop"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="ALL">Tat ca trang thai</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="REVOKED">REVOKED</option>
            </select>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="overflow-hidden rounded-[2rem] border border-slate-300 bg-white shadow-sm">
              {!filteredLinks.length ? (
                <EmptyState
                  title="Khong co link dang hien thi"
                  description="Cac link co san pham het hang, bi an hoac khong con du dieu kien tiep thi se tu dong an khoi giao dien nay."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Ma link",
                          "San pham",
                          "Shop",
                          "Click",
                          "Don",
                          "Trang thai",
                          "Ngay tao",
                          "Tac vu",
                        ].map((title) => (
                          <th key={title} className="px-4 py-4 text-left text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLinks.map((link) => {
                        const isSelected = String(link.id) === String(selectedLinkId);
                        const isRevoked = link.status === "REVOKED";
                        return (
                          <tr
                            key={link.id}
                            className={`align-top transition ${isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"}`}
                          >
                            <td className="px-4 py-4 text-sm text-slate-700">
                              <button type="button" className="font-medium text-slate-900 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline" onClick={() => setSelectedLinkId(link.id)}>
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
                                  Sao chep
                                </Button>
                                {isRevoked ? (
                                  <Button size="sm" variant="secondary" onClick={() => handleUnrevokeLink(link)} disabled={link.revoked_by_admin || revokingLinkId === link.id}>
                                    {revokingLinkId === link.id ? "Dang mo..." : "Mo khoa"}
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="danger" onClick={() => handleRevokeLink(link)} disabled={revokingLinkId === link.id}>
                                    {revokingLinkId === link.id ? "Dang khoa..." : "Khoa link"}
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

            <div className="space-y-6">
              {selectedLink ? (
                <>
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Link dang chon</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">Chon tung dong trong bang ben trai de xem va sao chep link day du cua san pham do.</p>
                      </div>
                      <StatusBadge status={selectedLink.status_display} />
                    </div>
                    <div className="mt-5 space-y-3">
                      <p className="text-sm font-medium text-slate-900">{selectedLink.product_name}</p>
                      <p className="text-sm text-slate-600">Shop: {selectedLink.shop_name}</p>
                      <p className="text-sm text-slate-600">Click: {Number(selectedLink.click_count || 0).toLocaleString("vi-VN")} | Don: {Number(selectedLink.order_count || 0).toLocaleString("vi-VN")}</p>
                      <p className="text-sm text-slate-600">Ma link: {selectedLink.short_code}</p>
                      {selectedLink.status === "REVOKED" ? (
                        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {selectedLink.revoked_by_admin
                            ? "Link nay da bi admin vo hieu hoa. Affiliate khong the tu mo lai link nay."
                            : "Link nay da bi vo hieu hoa. He thong se khong ghi nhan click moi tu link nay nua."}
                        </p>
                      ) : null}
                      {selectedLink.status === "REVOKED" && selectedLink.revoked_by_label ? (
                        <p className="text-sm text-slate-600">Khoa boi: {selectedLink.revoked_by_label}</p>
                      ) : null}
                    </div>
                    <div className="mt-5">
                      <CopyBox value={selectedUrl} label="URL day du de sao chep" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => handleQuickCopy(selectedLink)} disabled={selectedLink.status === "REVOKED"}>
                        Sao chep link tiep thi
                      </Button>
                      {selectedLink.status === "REVOKED" ? (
                        <Button variant="secondary" onClick={() => handleUnrevokeLink(selectedLink)} disabled={selectedLink.revoked_by_admin || revokingLinkId === selectedLink.id}>
                          {revokingLinkId === selectedLink.id ? "Dang mo..." : "Mo khoa link nay"}
                        </Button>
                      ) : (
                        <Button variant="danger" onClick={() => handleRevokeLink(selectedLink)} disabled={revokingLinkId === selectedLink.id}>
                          {revokingLinkId === selectedLink.id ? "Dang khoa..." : "Khoa link nay"}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                      <img src={selectedLink.product_image} alt={selectedLink.product_name} className="h-full w-full object-cover" />
                    </div>
                    <div className="space-y-4 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-sky-700">Chi tiet san pham</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedLink.product_name}</h3>
                        </div>
                        <StatusBadge status={selectedLink.status_display} />
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1">{selectedLink.product_category || "Chung"}</span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Ton kho: {Number(selectedLink.product_stock || 0).toLocaleString("vi-VN")}</span>
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">Hoa hong: {selectedLink.commission_value}%</span>
                      </div>
                      <p className="text-2xl font-semibold tabular-nums text-slate-900">{formatCurrency(selectedLink.product_price)}</p>
                      <p className="text-sm leading-7 text-slate-600">
                        {selectedLink.product_description || "San pham nay chua co mo ta chi tiet trong he thong."}
                      </p>
                      <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        <p>Shop: {selectedLink.shop_name}</p>
                        <p>Ma link: {selectedLink.short_code}</p>
                        <p>Click: {Number(selectedLink.click_count || 0).toLocaleString("vi-VN")} | Don: {Number(selectedLink.order_count || 0).toLocaleString("vi-VN")}</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link to={`/products/${selectedLink.product_id}`}>
                          <Button variant="secondary">Xem trang san pham</Button>
                        </Link>
                        <Button variant="outline" onClick={() => handleQuickCopy(selectedLink)} disabled={selectedLink.status === "REVOKED"}>
                          Sao chep link tiep thi
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Huong dan</h3>
                <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                  <p>Trang nay duoc tach rieng theo tai khoan affiliate dang dang nhap, nen moi tai khoan chi nhin thay link cua chinh minh.</p>
                  <p>Bam vao ma link hoac nut `Xem link` o tung dong de hien URL day du ben phai.</p>
                  <p>Bam `Khoa link` neu ban khong muon tiep tuc dung link tiep thi do nua. Link bi khoa se khong ghi nhan click moi.</p>
                  <p>Neu chinh affiliate tu khoa link, ban co the bam `Mo khoa` de kich hoat lai link cu.</p>
                  <p>Neu admin da khoa link, quyen admin cao hon affiliate va link do khong duoc mo lai bang thao tac tao link moi.</p>
                </div>
              </div>
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
