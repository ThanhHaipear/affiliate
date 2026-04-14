function SectionIntro({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-700">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export default SectionIntro;
