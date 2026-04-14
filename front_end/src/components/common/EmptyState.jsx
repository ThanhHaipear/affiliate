import Button from "./Button";

function EmptyState({
  title = "Không có dữ liệu",
  description = "Chưa có dữ liệu để hiển thị ở khu vực này.",
  actionLabel,
  onAction,
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto max-w-lg">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Empty state</p>
        <h3 className="mt-4 text-2xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        {actionLabel ? (
          <div className="mt-6">
            <Button onClick={onAction}>{actionLabel}</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default EmptyState;
