import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSellerProductDetail, updateSellerAffiliateSetting, updateSellerProduct, uploadSellerProductImages } from "../../../api/productApi";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import ProductForm from "../../../components/product/ProductForm";
import { useToast } from "../../../hooks/useToast";
import { buildProductPayload } from "../../../lib/apiPayloads";
import { mapProductDto } from "../../../lib/apiMappers";

function SellerEditProductPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");
        const response = await getSellerProductDetail(productId);
        if (active) {
          setProduct(mapProductDto(response));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được sản phẩm để chỉnh sửa.");
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

  async function handleSubmit(values) {
    try {
      setSubmitting(true);

      let imageUrls = values.imageUrls || [];
      if (values.imageFiles?.length) {
        const uploadedImages = await uploadSellerProductImages(values.imageFiles, "product");
        imageUrls = uploadedImages.map((item) => item.url);
      }

      await updateSellerProduct(
        productId,
        buildProductPayload({
          ...values,
          imageUrls,
        }),
      );
      await updateSellerAffiliateSetting(productId, {
        commissionType: values.commission_type,
        commissionValue: Number(values.commission_value),
        isEnabled: true,
      });
      toast.success("Đã cập nhật sản phẩm và gửi lại cho admin duyệt.");
      navigate("/dashboard/seller/products");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được sản phẩm.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <EmptyState title="Đang tải sản phẩm" description="Hệ thống đang lấy dữ liệu sản phẩm từ backend." />;
  }

  if (error || !product) {
    return <EmptyState title="Không tải được sản phẩm" description={error || "Sản phẩm không tồn tại."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title={`Chỉnh sửa ${product.name}`}
        description="Seller có thể cập nhật lại giá bán, hoa hồng, bộ ảnh và gửi lại cấu hình affiliate khi cần."
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProductForm
          submitLabel="Lưu thay đổi"
          loading={submitting}
          onSubmit={handleSubmit}
          defaultValues={{
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            stock: product.stock,
            commission_type: product.commission_type,
            commission_value: product.commission_value,
            imageUrls: product.gallery || [],
          }}
        />
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Trạng thái hiện tại</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <StatusBadge status={product.approval_status} />
            <StatusBadge status={product.affiliate_setting_status} />
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Nếu chọn bộ ảnh mới, hệ thống sẽ thay toàn bộ danh sách ảnh cũ bằng danh sách mới. Sau khi lưu, sản phẩm và cấu hình affiliate sẽ quay lại hàng chờ admin duyệt.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SellerEditProductPage;
