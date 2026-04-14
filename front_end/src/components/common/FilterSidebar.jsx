function FilterSidebar({ title = "Bộ lọc", children }) {
  return (
    <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-700">{title}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </aside>
  );
}

export default FilterSidebar;
