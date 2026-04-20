import { useEffect, useMemo, useState } from "react";
import Button from "../common/Button";
import FileUploadField from "../common/FileUploadField";
import Input from "../common/Input";
import Select from "../common/Select";
import { productSchema } from "../../schemas/productSchemas";

function normalizeInitialValues(defaultValues, stockMin) {
  return (
    defaultValues || {
      name: "",
      description: "",
      price: "",
      category: "",
      categoryId: "",
      stock: stockMin > 0 ? stockMin : 0,
      commission_type: "PERCENT",
      commission_value: 10,
      imageUrls: [],
    }
  );
}

function ProductForm({
  defaultValues,
  onSubmit,
  onInvalidSubmit,
  loading = false,
  submitLabel = "Lưu sản phẩm",
  stockMin = 0,
  categoryOptions = [],
}) {
  const initialValues = useMemo(
    () => normalizeInitialValues(defaultValues, stockMin),
    [defaultValues, stockMin],
  );

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState(initialValues.imageUrls || []);

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
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

  function updateField(name, nextValue) {
    setValues((currentValues) => ({
      ...currentValues,
      [name]: nextValue,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  function handleCategoryChange(event) {
    const nextCategory = event.target.value;
    const matchedOption = categoryOptions.find((option) => option.value === nextCategory);

    setValues((currentValues) => ({
      ...currentValues,
      category: nextCategory,
      categoryId: matchedOption?.id ? String(matchedOption.id) : "",
    }));

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors.category;
      return nextErrors;
    });
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    const payload = {
      ...values,
      commission_type: "PERCENT",
      imageUrls: initialValues.imageUrls || [],
      imageFiles,
    };

    const validationResult = productSchema.safeParse(payload);

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const normalizedErrors = Object.fromEntries(
        Object.entries(fieldErrors).map(([field, messages]) => [field, messages?.[0] || "Dữ liệu không hợp lệ."]),
      );

      setErrors(normalizedErrors);
      onInvalidSubmit?.(normalizedErrors);
      return;
    }

    setErrors({});
    await onSubmit?.(payload);
  }

  const validationMessages = Object.values(errors).filter(Boolean);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleFormSubmit} noValidate>
        {validationMessages.length ? (
          <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p className="font-semibold">Biểu mẫu chưa hợp lệ.</p>
            <div className="mt-2 space-y-1">
              {validationMessages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          </div>
        ) : null}

        <Input
          label="Tên sản phẩm"
          value={values.name ?? ""}
          error={errors.name}
          onChange={(event) => updateField("name", event.target.value)}
        />

        {categoryOptions.length ? (
          <Select
            label="Danh mục"
            error={errors.category}
            value={values.category ?? ""}
            onChange={handleCategoryChange}
            options={[
              { label: "Chọn danh mục", value: "" },
              ...categoryOptions.map((option) => ({
                label: option.label,
                value: option.value,
              })),
            ]}
          />
        ) : (
          <Input
            label="Danh mục"
            value={values.category ?? ""}
            error={errors.category}
            onChange={(event) => updateField("category", event.target.value)}
          />
        )}

        <Input
          label="Giá bán (VND)"
          type="number"
          min="1"
          step="1"
          value={values.price ?? ""}
          error={errors.price}
          onChange={(event) => updateField("price", event.target.value)}
        />

        <Input
          label="Tồn kho"
          type="number"
          min={String(stockMin)}
          step="1"
          value={values.stock ?? ""}
          error={errors.stock}
          onChange={(event) => updateField("stock", event.target.value)}
        />

        <Input
          label="Hoa hồng affiliate (%)"
          type="number"
          min="0"
          max="100"
          step="1"
          value={values.commission_value ?? ""}
          error={errors.commission_value}
          hint="Nhập phần trăm hoa hồng áp dụng cho affiliate của sản phẩm này."
          onChange={(event) => updateField("commission_value", event.target.value)}
        />

        <div className="md:col-span-2">
          <Input
            label="Mô tả"
            value={values.description ?? ""}
            error={errors.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
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
                <div
                  key={`${imagePreview}-${index}`}
                  className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white"
                >
                  <img
                    src={imagePreview}
                    alt={`Ảnh sản phẩm ${index + 1}`}
                    className="h-40 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Chưa có ảnh sản phẩm.</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Button type="submit" loading={loading}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProductForm;
