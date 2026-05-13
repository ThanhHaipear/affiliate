import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSellerProductDetail, setSellerProductVisibility } from "../../../api/productApi";
import { createAppeal, getMyAppeals, sendAppealMessage } from "../../../api/appealApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { mapProductDto } from "../../../lib/apiMappers";
import { formatDateTime } from "../../../lib/format";

function SellerProductDetailPage() {
  const { productId } = useParams();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [appealText, setAppealText] = useState("");
  const [appealLoading, setAppealLoading] = useState(false);
  const [existingAppeal, setExistingAppeal] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");
        const response = await getSellerProductDetail(productId);
        if (active) {
          const mapped = mapProductDto(response);
          setProduct(mapped);
          setSelectedImage(mapped.gallery?.[0] || mapped.image);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được chi tiết sản phẩm.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!product?.admin_hidden) return;
    loadAppeal();
  }, [product?.id, product?.admin_hidden]);

  async function loadAppeal() {
    try {
      const appeals = await getMyAppeals();
      const found = (appeals || []).find(
        (a) => a.targetType === "PRODUCT" && String(a.targetId) === String(product?.id)
      );
      if (found) setExistingAppeal(found);
    } catch {
      // Silently ignore
    }
  }

  if (loading) {
    return <EmptyState title="Đang tải chi tiết sản phẩm" description="Hệ thống đang đọc dữ liệu từ backend." />;
  }

  if (error || !product) {
    return <EmptyState title="Không tải được sản phẩm" description={error || "Sản phẩm không tồn tại."} />;
  }

  const gallery = product.gallery?.length ? product.gallery : [product.image];

  async function handleToggleVisibility() {
    try {
      const nextVisible = product.seller_hidden || product.admin_hidden;

      if (product.admin_hidden && nextVisible) {
        toast.error("Sản phẩm đang bị admin ẩn nên seller không thể tự mở lại.");
        return;
      }

      setSubmitting(true);
      const updated = await setSellerProductVisibility(product.id, { visible: nextVisible });
      setProduct(mapProductDto(updated));
      toast.success(nextVisible ? "Đã mở lại sản phẩm." : "Đã ẩn sản phẩm khỏi shop.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được trạng thái hiển thị.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitAppeal() {
    if (!appealText.trim()) return;
    try {
      setAppealLoading(true);
      if (existingAppeal && existingAppeal.status === "OPEN") {
        const updated = await sendAppealMessage(existingAppeal.id, { content: appealText.trim() });
        setExistingAppeal(updated);
      } else {
        const created = await createAppeal({
          targetType: "PRODUCT",
          targetId: product.id,
          content: appealText.trim(),
        });
        setExistingAppeal(created);
      }
      setAppealText("");
      toast.success("Kiến nghị đã được gửi thành công.");
    } catch (appealError) {
      toast.error(appealError.response?.data?.message || "Không gửi được kiến nghị.");
    } finally {
      setAppealLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title={product.name}

        action={
          <div className="flex gap-3">
            <Link to={`/dashboard/seller/products/${product.id}/edit`}>
              <Button>Chỉnh sửa</Button>
            </Link>
            <Button variant={product.seller_hidden || product.admin_hidden ? "secondary" : "ghost"} loading={submitting} onClick={handleToggleVisibility}>
              {product.seller_hidden || product.admin_hidden ? "Hiện sản phẩm" : "Ẩn sản phẩm"}
            </Button>
            <Link to="/dashboard/seller/orders">
              <Button variant="secondary">Xem đơn liên quan</Button>
            </Link>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <img src={selectedImage || product.image} alt={product.name} className="h-72 w-full rounded-[1.5rem] object-cover" />
          {gallery.length > 1 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {gallery.map((image) => (
                <button key={image} type="button" onClick={() => setSelectedImage(image)} className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                  <img src={image} alt={product.name} className="h-24 w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Metric label="Giá bán" value={<MoneyText value={product.price} />} />
            <Metric label="Tồn kho" value={`${Number(product.stock || 0).toLocaleString("vi-VN")} sản phẩm`} />
            <Metric label="Danh mục" value={product.category} />
            <Metric
              label="Hoa hồng affiliate"
              value={`${Number(product.commission_value || 0).toLocaleString("vi-VN")}%`}
            />
          </div>
          <div className="mt-5 rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-900">Mô tả</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{product.description || "Chưa có mô tả chi tiết."}</p>
          </div>
        </div>
        <div className="space-y-6">
          <Panel title="Trạng thái">
            <div className="flex flex-wrap gap-3">
              <StatusBadge status={product.approval_status} />
              <StatusBadge status={product.affiliate_setting_status} />
              <StatusBadge status={product.visibility_status} />
            </div>

            {product.admin_hidden ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-700">⚠️ Sản phẩm đang bị admin ẩn</p>
                  <p className="mt-1 text-sm text-rose-600">Seller không thể tự mở lại cho đến khi admin cho phép hiển thị.</p>
                  {product.raw?.lockReason ? (
                    <div className="mt-3 rounded-xl bg-rose-100 p-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-rose-500">Lý do từ admin</p>
                      <p className="mt-1 text-sm text-rose-800">{product.raw.lockReason}</p>
                    </div>
                  ) : null}
                </div>

                {/* Appeal section */}
                {existingAppeal?.messages?.length ? (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lịch sử kiến nghị</p>
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                      {existingAppeal.messages.map((msg) => {
                        const isAdmin = msg.sender?.adminProfile;
                        const senderName = isAdmin
                          ? (msg.sender.adminProfile.fullName || "Admin")
                          : (msg.sender?.sellers?.[0]?.shopName || msg.sender?.affiliate?.fullName || msg.sender?.email || "Bạn");
                        return (
                          <div key={String(msg.id)} className={`rounded-xl p-3 text-sm ${isAdmin ? "bg-sky-50 text-sky-800" : "bg-slate-50 text-slate-700"}`}>
                            <p className="text-xs font-medium">{senderName} · {formatDateTime(msg.createdAt)}</p>
                            <p className="mt-1">{msg.content}</p>
                            {msg.action === "UNLOCK" ? <p className="mt-1 text-xs font-semibold text-emerald-600">✓ Đã mở khóa</p> : null}
                          </div>
                        );
                      })}
                    </div>
                    {existingAppeal.status === "RESOLVED" ? (
                      <p className="mt-3 text-xs font-medium text-emerald-600">✓ Kiến nghị đã được giải quyết</p>
                    ) : null}
                  </div>
                ) : null}

                {(!existingAppeal || existingAppeal.status === "OPEN") && (
                  <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">Gửi kiến nghị cho admin</p>
                    <textarea
                      value={appealText}
                      onChange={(e) => setAppealText(e.target.value)}
                      placeholder="Nhập nội dung kiến nghị..."
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                    <Button
                      size="sm"
                      onClick={handleSubmitAppeal}
                      loading={appealLoading}
                      disabled={!appealText.trim()}
                    >
                      {existingAppeal ? "Gửi thêm tin nhắn" : "Gửi kiến nghị"}
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </Panel>

        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default SellerProductDetailPage;
