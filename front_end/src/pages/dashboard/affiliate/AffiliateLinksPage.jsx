import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAffiliateLinks, revokeAffiliateLink } from "../../../api/affiliateApi";
import Button from "../../../components/common/Button";
import CopyBox from "../../../components/common/CopyBox";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatCurrency, formatDateTime } from "../../../lib/format";
import { mapAffiliateLinkDto } from "../../../lib/apiMappers";

function AffiliateLinksPage() {
  const toast = useToast();
  const [links, setLinks] = useState([]);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [revokingLinkId, setRevokingLinkId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const selectedLink = useMemo(() => {
    return links.find((item) => String(item.id) === String(selectedLinkId)) || links[0] || null;
  }, [links, selectedLinkId]);

  const selectedUrl = selectedLink
    ? `${window.location.origin}/products/${selectedLink.product_id}?ref=${selectedLink.short_code}`
    : "";

  async function handleQuickCopy(link) {
    if (link.status === "REVOKED") {
      toast.error("Link này đã bị hủy, không thể tiếp tục copy để tiếp thị.");
      return;
    }

    const url = `${window.location.origin}/products/${link.product_id}?ref=${link.short_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setSelectedLinkId(link.id);
      toast.success("Đã sao chép link đang chọn.");
    } catch {
      toast.error("Không sao chép được link.");
    }
  }

  async function handleRevokeLink(link) {
    if (link.status === "REVOKED") {
      toast.error("Link này đã được hủy trước đó.");
      return;
    }

    const shouldRevoke = window.confirm(`Bạn có chắc muốn hủy link ${link.short_code}? Link đã hủy sẽ không tiếp tục ghi nhận click mới.`);
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
      toast.success("Đã hủy link tiếp thị.");
    } catch (revokeError) {
      toast.error(revokeError.response?.data?.message || "Không hủy được link tiếp thị.");
    } finally {
      setRevokingLinkId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate"
        title="Danh sách link đã tạo"
        description="Bấm vào từng dòng hoặc nút sao chép để hiện URL đầy đủ bên phải và copy ngay."
        action={
          <Link to="/affiliate/products">
            <Button>Tạo link mới</Button>
          </Link>
        }
      />
      {loading ? <EmptyState title="Đang tải affiliate link" description="Hệ thống đang đọc tracking link từ database." /> : null}
      {!loading && error ? <EmptyState title="Không tải được affiliate link" description={error} /> : null}
      {!loading && !error ? (
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="overflow-hidden rounded-[2rem] border border-slate-300 bg-white shadow-sm">
            {!links.length ? (
              <EmptyState
                title="Chưa có link tiếp thị"
                description="Hãy tạo link từ marketplace hoặc trang chi tiết sản phẩm."
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
                    {links.map((link) => {
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
                          <td className="px-4 py-4 text-sm text-slate-700"><StatusBadge status={link.status} /></td>
                          <td className="px-4 py-4 text-sm text-slate-700">{formatDateTime(link.created_at)}</td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="secondary" onClick={() => setSelectedLinkId(link.id)}>
                                Xem link
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleQuickCopy(link)} disabled={isRevoked}>
                                Sao chép
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => handleRevokeLink(link)} disabled={isRevoked || revokingLinkId === link.id}>
                                {revokingLinkId === link.id ? "Đang hủy..." : "Hủy link"}
                              </Button>
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
                      <h3 className="text-xl font-semibold text-slate-900">Link đang chọn</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">Chọn từng dòng trong bảng bên trái để xem và sao chép link đầy đủ của sản phẩm đó.</p>
                    </div>
                    <StatusBadge status={selectedLink.status} />
                  </div>
                  <div className="mt-5 space-y-3">
                    <p className="text-sm font-medium text-slate-900">{selectedLink.product_name}</p>
                    <p className="text-sm text-slate-600">Shop: {selectedLink.shop_name}</p>
                    <p className="text-sm text-slate-600">Click: {Number(selectedLink.click_count || 0).toLocaleString("vi-VN")} | Đơn: {Number(selectedLink.order_count || 0).toLocaleString("vi-VN")}</p>
                    <p className="text-sm text-slate-600">Mã link: {selectedLink.short_code}</p>
                    {selectedLink.status === "REVOKED" ? (
                      <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        Link này đã bị hủy. Hệ thống sẽ không ghi nhận click mới từ link này nữa.
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-5">
                    <CopyBox value={selectedUrl} label="URL đầy đủ để sao chép" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => handleQuickCopy(selectedLink)} disabled={selectedLink.status === "REVOKED"}>
                      Sao chép link tiếp thị
                    </Button>
                    <Button variant="danger" onClick={() => handleRevokeLink(selectedLink)} disabled={selectedLink.status === "REVOKED" || revokingLinkId === selectedLink.id}>
                      {revokingLinkId === selectedLink.id ? "Đang hủy..." : "Hủy link này"}
                    </Button>
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
                      <StatusBadge status={selectedLink.status} />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">{selectedLink.product_category || "Chung"}</span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Tồn kho: {Number(selectedLink.product_stock || 0).toLocaleString("vi-VN")}</span>
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">Hoa hồng: {selectedLink.commission_value}%</span>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums text-slate-900">{formatCurrency(selectedLink.product_price)}</p>
                    <p className="text-sm leading-7 text-slate-600">
                      {selectedLink.product_description || "Sản phẩm này chưa có mô tả chi tiết trong hệ thống."}
                    </p>
                    <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <p>Shop: {selectedLink.shop_name}</p>
                      <p>Mã link: {selectedLink.short_code}</p>
                      <p>Click: {Number(selectedLink.click_count || 0).toLocaleString("vi-VN")} | Đơn: {Number(selectedLink.order_count || 0).toLocaleString("vi-VN")}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link to={`/products/${selectedLink.product_id}`}>
                        <Button variant="secondary">Xem trang sản phẩm</Button>
                      </Link>
                      <Button variant="outline" onClick={() => handleQuickCopy(selectedLink)} disabled={selectedLink.status === "REVOKED"}>
                        Sao chép link tiếp thị
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Hướng dẫn</h3>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <p>Bấm vào mã link hoặc nút `Xem link` ở từng dòng để hiện URL đầy đủ bên phải.</p>
                <p>Khi bấm vào mã link, hệ thống sẽ hiện thêm thẻ chi tiết sản phẩm để bạn xem nhanh ảnh, giá và thông tin chính.</p>
                <p>Bấm `Hủy link` nếu bạn không muốn tiếp tục dùng link tiếp thị đó nữa. Link đã hủy sẽ không ghi nhận click mới.</p>
                <p>Nếu cần dùng lại cho sản phẩm đó, bạn có thể tạo link lại sau. Hệ thống sẽ mở lại link cũ thay vì tạo bản ghi trùng.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AffiliateLinksPage;
