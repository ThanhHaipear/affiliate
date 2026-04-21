import Button from "../common/Button";
import Input from "../common/Input";
import Select from "../common/Select";

function FilterBar({
  searchValue,
  onSearchChange,
  searchLabel = "Tìm kiếm",
  searchPlaceholder = "Tìm kiếm",
  filters = [],
  primaryAction,
}) {
  const filterGridClassName =
    filters.length <= 1
      ? "grid-cols-1"
      : filters.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto]">
        <Input
          label={searchLabel}
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />

        {filters.length ? (
          <div className={`grid gap-4 ${filterGridClassName}`}>
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <span className={filter.label ? "text-sm font-medium text-slate-800" : "invisible text-sm font-medium"}>
                  {filter.label || "Bộ lọc"}
                </span>
                <Select
                  label=""
                  value={filter.value}
                  onChange={(event) => filter.onChange(event.target.value)}
                  options={filter.options}
                />
              </div>
            ))}
          </div>
        ) : null}

        {primaryAction ? (
          <div className="flex items-end">
            <Button className="w-full lg:w-auto" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default FilterBar;
