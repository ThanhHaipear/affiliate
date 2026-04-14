import Input from "./Input";

function SearchBar({ value, onChange, placeholder = "Tìm kiếm..." }) {
  return (
    <div className="max-w-md">
      <Input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default SearchBar;
