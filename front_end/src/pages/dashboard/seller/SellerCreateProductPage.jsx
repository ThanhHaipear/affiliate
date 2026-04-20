import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createSellerProduct,
  getProductCategories,
  getSellerProducts,
  getProducts,
  updateSellerAffiliateSetting,
  uploadSellerProductImages,
} from "../../../api/productApi";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import ProductForm from "../../../components/product/ProductForm";
import { useToast } from "../../../hooks/useToast";
import { buildProductPayload } from "../../../lib/apiPayloads";

const fallbackCategories = [
  { id: 1, label: "Làm đẹp", value: "Làm đẹp" },
  { id: 2, label: "Nhà cửa", value: "Nhà cửa" },
  { id: 3, label: "Công nghệ", value: "Công nghệ" },
  { id: 4, label: "Thời trang", value: "Thời trang" },
];

function SellerCreateProductPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        setCategoriesLoading(true);

        const [categoriesResponse, sellerProductsResponse, publicProductsResponse] = await Promise.all([
          getProductCategories().catch(() => []),
          getSellerProducts().catch(() => []),
          getProducts().catch(() => []),
        ]);

        if (!active) {
          return;
        }

        const uniqueCategories = new Map();
        const normalizedCategories = (categoriesResponse || [])
          .map((category) => ({
            id: category.id,
            label: category.name,
            value: category.name,
          }))
          .filter((category) => category.id && category.value);

        const sourceRows = [...(sellerProductsResponse || []), ...(publicProductsResponse || [])];

        normalizedCategories.forEach((category) => {
          uniqueCategories.set(String(category.id), category);
        });

        sourceRows.forEach((product) => {
          const categoryId = product?.category?.id;
          const categoryName = product?.category?.name;

          if (!categoryId || !categoryName || uniqueCategories.has(String(categoryId))) {
            return;
          }

          uniqueCategories.set(String(categoryId), {
            id: categoryId,
            label: categoryName,
            value: categoryName,
          });
        });

        const resolvedCategories = Array.from(uniqueCategories.values()).sort((left, right) =>
          left.label.localeCompare(right.label),
        );

        setCategories(resolvedCategories.length ? resolvedCategories : fallbackCategories);
      } catch (_loadError) {
        if (active) {
          setCategories(fallbackCategories);
        }
      } finally {
        if (active) {
          setCategoriesLoading(false);
        }
      }
    }

    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  const defaultCategory = useMemo(() => categories[0] || null, [categories]);

  async function handleSubmit(values) {
    try {
      setLoading(true);

      if (Number(values.stock) <= 0) {
        toast.error("Tồn kho phải lớn hơn 0 khi tạo sản phẩm mới.");
        return;
      }

      if (!values.imageFiles?.length) {
        toast.error("Hãy chọn ít nhất 1 ảnh sản phẩm trước khi tạo.");
        return;
      }

      if (!values.categoryId) {
        toast.error("Vui lòng chọn danh mục từ dữ liệu hệ thống.");
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

  if (categoriesLoading) {
    return (
      <EmptyState
        title="Đang tải dữ liệu tạo sản phẩm"
        description="Hệ thống đang đồng bộ danh mục thực tế để người bán chọn đúng dữ liệu hiện có."
      />
    );
  }

  if (!categories.length) {
    return (
      <EmptyState
        title="Chưa có danh mục để chọn"
        description="Hệ thống hiện chưa đọc được danh mục sản phẩm từ dữ liệu đang có."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Tạo sản phẩm mới"

      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProductForm
          submitLabel="Tạo sản phẩm"
          loading={loading}
          onSubmit={handleSubmit}
          onInvalidSubmit={() =>
            toast.error("Biểu mẫu chưa hợp lệ. Hãy kiểm tra lại tên, mô tả, giá, danh mục và tồn kho.")
          }
          stockMin={1}
          categoryOptions={categories}
          defaultValues={{
            name: "",
            description: "",
            price: "",
            category: defaultCategory?.value || "",
            categoryId: defaultCategory?.id ? String(defaultCategory.id) : "",
            stock: 1,
            commission_type: "PERCENT",
            commission_value: 10,
            imageUrls: [],
          }}
        />

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Quy trình affiliate</h3>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <p>1. Người bán tạo sản phẩm và chọn bộ ảnh cần tải lên.</p>
            <p>2. Hệ thống tải ảnh lên trước, sau đó mới tạo sản phẩm trong cơ sở dữ liệu.</p>
            <p>3. Nếu bật affiliate, hệ thống tạo cấu hình hoa hồng và chuyển sang admin duyệt.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SellerCreateProductPage;
