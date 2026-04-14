function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-8 text-slate-200">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default LoadingSpinner;
