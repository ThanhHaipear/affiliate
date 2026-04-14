import Input from "../common/Input";
import Select from "../common/Select";

function ProductFilter({
  search,
  sort,
  category = "ALL",
  categories = [],
  onSearchChange,
  onSortChange,
  onCategoryChange,
}) {
  return (
    <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-3">
      <Input
        label="Tìm kiếm"
        value={search}
        onChange={(event) => onSearchChange?.(event.target.value)}
        placeholder="Tên sản phẩm, shop..."
      />
      <Select
        label="Danh mục"
        value={category}
        onChange={(event) => onCategoryChange?.(event.target.value)}
        options={[
          { label: "Tất cả danh mục", value: "ALL" },
          ...categories.map((item) => ({ label: item, value: item })),
        ]}
      />
      <Select
        label="Sắp xếp"
        value={sort}
        onChange={(event) => onSortChange?.(event.target.value)}
        options={[
          { label: "Mới nhất", value: "latest" },
          { label: "Giá tăng dần", value: "price-asc" },
          { label: "Giá giảm dần", value: "price-desc" },
          { label: "Hoa hồng cao nhất", value: "commission-desc" },
        ]}
      />
    </div>
  );
}

export default ProductFilter;
