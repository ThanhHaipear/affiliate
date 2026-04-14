import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Select = forwardRef(function Select(
  { label, hint, error, options = [], className, ...props },
  ref,
) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-slate-800">{label}</span> : null}
      <select
        ref={ref}
        className={cn(
          "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100",
          error && "border-rose-400 focus:border-rose-400 focus:ring-rose-100",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
});

export default Select;
