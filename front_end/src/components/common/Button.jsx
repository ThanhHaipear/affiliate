import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const variants = {
  primary: "bg-sky-700 text-white hover:bg-sky-800 shadow-sm",
  secondary: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 shadow-sm",
  outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const Button = forwardRef(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    type = "button",
    loading = false,
    disabled = false,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? "Đang tải..." : children}
    </button>
  );
});

export default Button;
