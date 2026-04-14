import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSellerProduct, updateSellerAffiliateSetting, uploadSellerProductImages } from "../../../api/productApi";
import PageHeader from "../../../components/common/PageHeader";
import ProductForm from "../../../components/product/ProductForm";
import { useToast } from "../../../hooks/useToast";
import { buildProductPayload } from "../../../lib/apiPayloads";

function SellerCreateProductPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values) {
    try {
      setLoading(true);

      if (!values.imageFiles?.length) {
        toast.error("Hãy chọn ít nhất 1 ảnh sản phẩm trước khi tạo.");
        return;
      }

      const uploadedImages = await uploadSellerProductImages(values.imageFiles, "product");
      const createdProduct = await createSellerProduct(
        buildProductPayload({
          ...values,
          imageUrls: uploadedImages.map((item) => item.url),
        }),
      );

      await updateSellerAffiliateSetting(createdProduct.id, {
        commissionType: values.commission_type,
        commissionValue: Number(values.commission_value),
        isEnabled: true,
      });

      toast.success("Đã tạo sản phẩm và gửi cấu hình affiliate.");
      navigate("/dashboard/seller/products");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không tạo được sản phẩm.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Tạo sản phẩm mới"
        description="Tạo sản phẩm mới cho shop. Nếu bật affiliate, cấu hình hoa hồng sẽ được gửi admin duyệt."
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProductForm submitLabel="Tạo sản phẩm" loading={loading} onSubmit={handleSubmit} />
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Quy trình affiliate</h3>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <p>1. Seller tạo sản phẩm và chọn bộ ảnh cần tải lên.</p>
            <p>2. Hệ thống tải ảnh lên trước, sau đó mới tạo sản phẩm trong database.</p>
            <p>3. Nếu bật affiliate, hệ thống tạo cấu hình hoa hồng và chuyển sang admin duyệt.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SellerCreateProductPage;
