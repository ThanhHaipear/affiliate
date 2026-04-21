import Input from "../common/Input";
import Select from "../common/Select";

function ProductFilter({
  search,
  sort,
  category = "ALL",
  categories = [],
  canSortByCommission = false,
  onSearchChange,
  onSortChange,
  onCategoryChange,
}) {
  const sortOptions = [
    { label: "Mới nhất", value: "latest" },
    { label: "Giá tăng dần", value: "price-asc" },
    { label: "Giá giảm dần", value: "price-desc" },
  ];
  const categoryOptions = [
    { label: "Tất cả danh mục", value: "ALL" },
    ...categories.map((item) =>
      typeof item === "string" ? { label: item, value: item } : { label: item.label || item.name, value: item.value || item.slug || item.name },
    ),
  ];

  if (canSortByCommission) {
    sortOptions.push({ label: "Hoa hồng cao nhất", value: "commission-desc" });
  }

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
        options={categoryOptions}
      />
      <Select
        label="Sắp xếp"
        value={sort}
        onChange={(event) => onSortChange?.(event.target.value)}
        options={sortOptions}
      />
    </div>
  );
}

export default ProductFilter;
