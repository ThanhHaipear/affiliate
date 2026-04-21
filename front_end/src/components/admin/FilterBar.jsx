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
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(180px,1fr))_auto]">
        <Input
          label={searchLabel}
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
        {filters.map((filter) => (
          <Select
            key={filter.key}
            label={filter.label}
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
            options={filter.options}
          />
        ))}
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
