import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getProductCategories,
  getProducts,
  getSellerProductDetail,
  getSellerProducts,
  updateSellerAffiliateSetting,
  updateSellerProduct,
  uploadSellerProductImages,
} from "../../../api/productApi";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import ProductForm from "../../../components/product/ProductForm";
import { useToast } from "../../../hooks/useToast";
import { buildProductPayload } from "../../../lib/apiPayloads";
import { mapProductDto } from "../../../lib/apiMappers";

const fallbackCategories = [
  { id: 1, label: "Làm đẹp", value: "Làm đẹp" },
  { id: 2, label: "Nhà cửa", value: "Nhà cửa" },
  { id: 3, label: "Công nghệ", value: "Công nghệ" },
  { id: 4, label: "Thời trang", value: "Thời trang" },
];

function SellerEditProductPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPageData() {
      try {
        setLoading(true);
        setError("");

        const [productResponse, categoriesResponse, sellerProductsResponse, publicProductsResponse] = await Promise.all([
          getSellerProductDetail(productId),
          getProductCategories().catch(() => []),
          getSellerProducts().catch(() => []),
          getProducts().catch(() => []),
        ]);

        if (!active) {
          return;
        }

        const mappedProduct = mapProductDto(productResponse);
        const uniqueCategories = new Map();

        (categoriesResponse || [])
          .map((category) => ({
            id: category.id,
            label: category.name,
            value: category.name,
          }))
          .filter((category) => category.id && category.value)
          .forEach((category) => {
            uniqueCategories.set(String(category.id), category);
          });

        [...(sellerProductsResponse || []), ...(publicProductsResponse || [])].forEach((item) => {
          const categoryId = item?.category?.id;
          const categoryName = item?.category?.name;

          if (!categoryId || !categoryName || uniqueCategories.has(String(categoryId))) {
            return;
          }

          uniqueCategories.set(String(categoryId), {
            id: categoryId,
            label: categoryName,
            value: categoryName,
          });
        });

        if (mappedProduct.raw?.category?.id && mappedProduct.raw?.category?.name) {
          uniqueCategories.set(String(mappedProduct.raw.category.id), {
            id: mappedProduct.raw.category.id,
            label: mappedProduct.raw.category.name,
            value: mappedProduct.raw.category.name,
          });
        }

        const resolvedCategories = Array.from(uniqueCategories.values()).sort((left, right) =>
          left.label.localeCompare(right.label),
        );

        setCategories(resolvedCategories.length ? resolvedCategories : fallbackCategories);
        setProduct(mappedProduct);
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

    loadPageData();
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

      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProductForm
          submitLabel="Lưu thay đổi"
          loading={submitting}
          onSubmit={handleSubmit}
          onInvalidSubmit={() => toast.error("Biểu mẫu chưa hợp lệ. Hãy kiểm tra lại tên, mô tả, giá, danh mục và tồn kho.")}
          categoryOptions={categories}
          defaultValues={{
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.raw?.category?.name || product.category || "",
            categoryId: product.raw?.categoryId
              ? String(product.raw.categoryId)
              : product.raw?.category?.id
                ? String(product.raw.category.id)
                : "",
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
