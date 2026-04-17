import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSellerProductDetail } from "../../../api/productApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { mapProductDto } from "../../../lib/apiMappers";

function SellerProductDetailPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

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

  if (loading) {
    return <EmptyState title="Đang tải chi tiết sản phẩm" description="Hệ thống đang đọc dữ liệu từ backend." />;
  }

  if (error || !product) {
    return <EmptyState title="Không tải được sản phẩm" description={error || "Sản phẩm không tồn tại."} />;
  }

  const gallery = product.gallery?.length ? product.gallery : [product.image];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title={product.name}
        description="Trang chi tiết sản phẩm để theo dõi giá bán, bộ ảnh, hoa hồng, trạng thái duyệt và các thao tác liên quan."
        action={
          <div className="flex gap-3">
            <Link to={`/dashboard/seller/products/${product.id}/edit`}>
              <Button>Chỉnh sửa</Button>
            </Link>
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
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Nếu sản phẩm bật affiliate, cấu hình hoa hồng vẫn cần admin duyệt trước khi affiliate có thể tạo link tiếp thị.
            </p>
          </Panel>
          <Panel title="Lịch sử cập nhật">
            <ul className="space-y-3 text-sm text-slate-600">
              <li>Seller tạo sản phẩm và nhập giá bán, tồn kho, mô tả.</li>
              <li>Bộ ảnh hiện tại được lưu trong database qua `product_images`.</li>
              <li>Nếu bật affiliate, hệ thống sẽ gửi cấu hình hoa hồng lên admin review.</li>
            </ul>
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
