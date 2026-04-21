import { useEffect, useMemo, useRef, useState } from "react";
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

function moveArrayItem(items, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
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
  const fileInputRef = useRef(null);

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
    setImageFiles([]);
    setImagePreviews(initialValues.imageUrls || []);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  function handleImageChange(event) {
    setImageFiles(Array.from(event.target.files || []));
  }

  function resetImageInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveImage(indexToRemove) {
    if (imageFiles.length) {
      const nextFiles = imageFiles.filter((_, index) => index !== indexToRemove);
      setImageFiles(nextFiles);

      if (!nextFiles.length) {
        resetImageInput();
      }

      return;
    }

    setImagePreviews((currentPreviews) => currentPreviews.filter((_, index) => index !== indexToRemove));
    setValues((currentValues) => ({
      ...currentValues,
      imageUrls: (currentValues.imageUrls || []).filter((_, index) => index !== indexToRemove),
    }));
  }

  function handleMoveImage(indexToMove, direction) {
    const nextIndex = direction === "up" ? indexToMove - 1 : indexToMove + 1;

    if (imageFiles.length) {
      setImageFiles((currentFiles) => moveArrayItem(currentFiles, indexToMove, nextIndex));
      return;
    }

    setImagePreviews((currentPreviews) => moveArrayItem(currentPreviews, indexToMove, nextIndex));
    setValues((currentValues) => ({
      ...currentValues,
      imageUrls: moveArrayItem(currentValues.imageUrls || [], indexToMove, nextIndex),
    }));
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    const payload = {
      ...values,
      commission_type: "PERCENT",
      imageUrls: values.imageUrls || [],
      imageFiles,
    };

    const validationResult = productSchema.safeParse(payload);

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const normalizedErrors = Object.fromEntries(
        Object.entries(fieldErrors).map(([field, messages]) => [
          field,
          messages?.[0] || "Dữ liệu không hợp lệ.",
        ]),
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
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
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
            ref={fileInputRef}
            label="Ảnh sản phẩm"
            hint="Có thể chọn nhiều ảnh. Nếu chọn nhầm, bạn có thể xóa từng ảnh hoặc đổi thứ tự trước khi lưu."
            multiple
            onChange={handleImageChange}
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
                  <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-sm font-medium text-sky-600 transition hover:text-sky-700 disabled:cursor-not-allowed disabled:text-slate-300"
                        onClick={() => handleMoveImage(index, "up")}
                        disabled={index === 0}
                      >
                        Lên
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-sky-600 transition hover:text-sky-700 disabled:cursor-not-allowed disabled:text-slate-300"
                        onClick={() => handleMoveImage(index, "down")}
                        disabled={index === imagePreviews.length - 1}
                      >
                        Xuống
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
                        onClick={() => handleRemoveImage(index)}
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-slate-600">Chưa có ảnh sản phẩm.</p>
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
