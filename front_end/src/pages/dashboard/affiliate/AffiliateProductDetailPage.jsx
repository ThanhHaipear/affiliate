import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { createAffiliateLink } from "../../../api/affiliateApi";
import { getProductDetail } from "../../../api/productApi";
import Button from "../../../components/common/Button";
import CopyBox from "../../../components/common/CopyBox";
import EmptyState from "../../../components/common/EmptyState";
import Input from "../../../components/common/Input";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import Select from "../../../components/common/Select";
import { useToast } from "../../../hooks/useToast";
import { mapProductDto } from "../../../lib/apiMappers";
import { affiliateCreateLinkSchema } from "../../../schemas/affiliatePortalSchemas";

const trafficSourceOptions = [
  { label: "Facebook", value: "facebook" },
  { label: "TikTok", value: "tiktok" },
  { label: "YouTube", value: "youtube" },
  { label: "Website", value: "website" },
  { label: "Email", value: "email" },
];

function AffiliateProductDetailPage() {
  const { productId } = useParams();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [generatedLink, setGeneratedLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(affiliateCreateLinkSchema),
    defaultValues: {
      trafficSource: "facebook",
      campaignTag: "",
    },
  });

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");
        const response = await getProductDetail(productId);
        if (!active) {
          return;
        }

        const mapped = mapProductDto(response);
        setProduct(mapped);
        setSelectedImage(mapped.gallery?.[0] || mapped.image);
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được sản phẩm affiliate.");
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

  const gallery = useMemo(() => {
    if (!product) {
      return [];
    }

    return product.gallery?.length ? product.gallery : [product.image];
  }, [product]);

  async function onSubmit(values) {
    try {
      setSubmitting(true);
      const response = await createAffiliateLink({ productId: Number(product.id) });
      const params = new URLSearchParams({ ref: response.shortCode, src: values.trafficSource });
      if (values.campaignTag) {
        params.set("campaign", values.campaignTag);
      }
      const link = `${window.location.origin}/products/${product.id}?${params.toString()}`;
      setGeneratedLink(link);
      toast.success("Đã tạo link tiếp thị cá nhân.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không tạo được link tiếp thị.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <EmptyState title="Đang tải chi tiết sản phẩm" description="Hệ thống đang đọc sản phẩm affiliate từ database." />;
  }

  if (error || !product) {
    return <EmptyState title="Không tìm thấy sản phẩm" description={error || "Sản phẩm này không tồn tại hoặc chưa sẵn sàng cho affiliate."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate Product"
        title={product.name}
        description="Xem chi tiết sản phẩm đã được phê duyệt affiliate và tạo link tracking cá nhân ngay tại đây."
      />
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <img src={selectedImage} alt={product.name} className="h-[420px] w-full object-cover" />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {gallery.map((image) => (
              <button
                key={image}
                type="button"
                onClick={() => setSelectedImage(image)}
                className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"
              >
                <img src={image} alt={product.name} className="h-24 w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Nội dung sản phẩm</h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">{product.description || "Sản phẩm này chưa có mô tả bổ sung."}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Đã duyệt affiliate
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                {product.seller_name}
              </span>
            </div>
            <div className="mt-5 flex items-end gap-3">
              <MoneyText value={product.price} className="text-4xl font-semibold tabular-nums text-slate-900" />
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                Hoa hồng {product.commission_value}%
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoTile label="Danh mục" value={product.category} />
              <InfoTile label="Trạng thái" value={product.approval_status} />
              <InfoTile label="Tồn kho" value={Number(product.stock || 0).toLocaleString("vi-VN")} />
              <InfoTile label="Shop" value={product.seller_name} />
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Hoa hồng chỉ được ghi nhận thực tế khi đơn hàng thành công và seller đã xác nhận nhận tiền.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Tạo link tiếp thị</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Chọn nguồn traffic và gắn campaign tag để quản lý chiến dịch dễ hơn.
            </p>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Select
                label="Nguồn traffic"
                error={errors.trafficSource?.message}
                options={trafficSourceOptions}
                {...register("trafficSource")}
              />
              <Input
                label="Campaign tag"
                placeholder="vd: flash-sale-thang-4"
                error={errors.campaignTag?.message}
                {...register("campaignTag")}
              />
              <Button type="submit" loading={submitting || isSubmitting}>
                Tạo link mới
              </Button>
            </form>
            {generatedLink ? <div className="mt-5"><CopyBox value={generatedLink} label="Link tiếp thị cá nhân" /></div> : null}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900">Hướng dẫn sử dụng</h3>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>Đặt link trong nội dung đánh giá, review hoặc video có liên quan trực tiếp đến sản phẩm.</p>
              <p>Theo dõi commission pending và approved ở trang hoa hồng để biết khi nào đủ điều kiện rút tiền.</p>
              <p>Nếu cần chia sẻ nhanh, bạn có thể sao chép link vừa tạo và dán vào kênh traffic đã chọn.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export default AffiliateProductDetailPage;
