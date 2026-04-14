import Button from "./Button";

function PageHeader({ eyebrow, title, description, actionLabel, onAction, action }) {
  return (
    <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.3em] text-sky-700">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        ) : null}
      </div>
      {action || actionLabel ? (
        <div className="flex shrink-0 items-center gap-3">
          {action || <Button onClick={onAction}>{actionLabel}</Button>}
        </div>
      ) : null}
    </div>
  );
}

export default PageHeader;
