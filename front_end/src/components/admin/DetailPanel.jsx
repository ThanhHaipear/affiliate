function DetailPanel({ title, eyebrow, children, footer }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,12,27,0.35)]">
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">{eyebrow}</p>
      ) : null}
      {title ? <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3> : null}
      <div className="mt-5 space-y-5">{children}</div>
      {footer ? <div className="mt-6 border-t border-white/10 pt-5">{footer}</div> : null}
    </section>
  );
}

export default DetailPanel;
