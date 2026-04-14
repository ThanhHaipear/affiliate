import { forwardRef, useId } from "react";
import { cn } from "../../lib/utils";

const Input = forwardRef(function Input(
  { label, hint, error, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = props.id || generatedId;

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      {label ? <span className="text-sm font-medium text-slate-800">{label}</span> : null}
      <input
        id={inputId}
        ref={ref}
        aria-label={props["aria-label"] || label}
        className={cn(
          "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100",
          error && "border-rose-400 focus:border-rose-400 focus:ring-rose-100",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
});

export default Input;
