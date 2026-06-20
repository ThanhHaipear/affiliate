import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductForm from "./ProductForm";

const defaultValues = {
  name: "Sản phẩm mẫu",
  description: "Mô tả sản phẩm ban đầu.",
  price: 100000,
  category: "Công nghệ",
  categoryId: "1",
  stock: 1,
  commission_type: "PERCENT",
  commission_value: 10,
  imageUrls: [],
};

function renderForm(overrides = {}) {
  return render(
    <ProductForm
      defaultValues={{ ...defaultValues, ...overrides }}
      categoryOptions={[{ id: 1, label: "Công nghệ", value: "Công nghệ" }]}
      onSubmit={vi.fn()}
    />,
  );
}

describe("ProductForm", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:product-image"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("keeps entered description and selected images after a parent rerender", async () => {
    const user = userEvent.setup();
    const { rerender } = renderForm();
    const description = screen.getByLabelText("Mô tả");
    const imageInput = screen.getByLabelText("Ảnh sản phẩm");
    const image = new File(["image"], "product.png", { type: "image/png" });

    await user.clear(description);
    await user.type(description, "Mô tả được nhập trước khi chọn ảnh.");
    await user.upload(imageInput, image);

    rerender(
      <ProductForm
        defaultValues={{ ...defaultValues }}
        categoryOptions={[{ id: 1, label: "Công nghệ", value: "Công nghệ" }]}
        onSubmit={vi.fn()}
      />,
    );

    expect(description).toHaveValue("Mô tả được nhập trước khi chọn ảnh.");
    expect(screen.getByAltText("Ảnh sản phẩm 1")).toBeInTheDocument();
  });

  it("keeps a selected image when description is entered afterwards", async () => {
    const user = userEvent.setup();
    const { rerender } = renderForm();
    const description = screen.getByLabelText("Mô tả");
    const imageInput = screen.getByLabelText("Ảnh sản phẩm");
    const image = new File(["image"], "product.png", { type: "image/png" });

    await user.upload(imageInput, image);
    await user.clear(description);
    await user.type(description, "Mô tả được nhập sau khi chọn ảnh.");

    rerender(
      <ProductForm
        defaultValues={{ ...defaultValues }}
        categoryOptions={[{ id: 1, label: "Công nghệ", value: "Công nghệ" }]}
        onSubmit={vi.fn()}
      />,
    );

    expect(description).toHaveValue("Mô tả được nhập sau khi chọn ảnh.");
    expect(screen.getByAltText("Ảnh sản phẩm 1")).toBeInTheDocument();
  });
});
