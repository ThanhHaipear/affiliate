import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Button from "../common/Button";
import FileUploadField from "../common/FileUploadField";
import Input from "../common/Input";
import { productSchema } from "../../schemas/productSchemas";

function ProductForm({
  defaultValues,
  onSubmit,
  loading = false,
  submitLabel = "Lưu sản phẩm",
  successMessage = "Sản phẩm đã được lưu và sẵn sàng cho bước phê duyệt.",
  stockMin = 0,
}) {
  const initialValues = useMemo(
    () =>
      defaultValues || {
        name: "",
        description: "",
        price: "",
        category: "Digital Product",
        stock: stockMin > 0 ? stockMin : 0,
        commission_type: "PERCENT",
        commission_value: 10,
        imageUrls: [],
      },
    [defaultValues, stockMin],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: initialValues,
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState(initialValues.imageUrls || []);

  useEffect(() => {
    setImageFiles([]);
    setImagePreviews(initialValues.imageUrls || []);
  }, [initialValues]);

  useEffect(() => {
    if (!imageFiles.length) {
      return undefined;
    }

    const objectUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  const stockRegister = register(
    "stock",
    stockMin > 0
      ? {
          validate: (value) =>
            Number(value) >= stockMin || `Tồn kho phải lớn hơn hoặc bằng ${stockMin}.`,
        }
      : undefined,
  );

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={handleSubmit((values) =>
          onSubmit?.({
            ...values,
            commission_type: "PERCENT",
            imageUrls: initialValues.imageUrls || [],
            imageFiles,
          }),
        )}
      >
        <Input label="Tên sản phẩm" error={errors.name?.message} {...register("name")} />
        <Input label="Danh mục" error={errors.category?.message} {...register("category")} />
        <Input label="Giá bán (VND)" error={errors.price?.message} {...register("price")} />
        <Input
          label="Tồn kho"
          type="number"
          min={String(stockMin)}
          step="1"
          error={errors.stock?.message}
          {...stockRegister}
        />
        <input type="hidden" value="PERCENT" {...register("commission_type")} />
        <Input
          label="Hoa hồng affiliate (%)"
          type="number"
          min="0"
          max="100"
          step="1"
          error={errors.commission_value?.message}
          hint="Nhập phần trăm hoa hồng áp dụng cho affiliate của sản phẩm này."
          {...register("commission_value")}
        />
        <div className="md:col-span-2">
          <Input label="Mô tả" error={errors.description?.message} {...register("description")} />
        </div>
        <div className="md:col-span-2 space-y-3">
          <FileUploadField
            label="Ảnh sản phẩm"
            hint="Có thể chọn nhiều ảnh. Nếu chọn ảnh mới khi sửa, danh sách ảnh cũ sẽ được thay bằng bộ ảnh mới."
            multiple
            onChange={(event) => setImageFiles(Array.from(event.target.files || []))}
          />
          {imagePreviews.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {imagePreviews.map((imagePreview, index) => (
                <div key={`${imagePreview}-${index}`} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                  <img src={imagePreview} alt={`Ảnh sản phẩm ${index + 1}`} className="h-40 w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Chưa có ảnh sản phẩm.</p>
          )}
        </div>
        <div className="md:col-span-2">
          <Button type="submit" loading={loading || isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
      {isSubmitSuccessful ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          {successMessage}
        </div>
      ) : null}
    </div>
  );
}

export default ProductForm;
