function StatCard({ label, value, hint, tone = "emerald", strong = false }) {
  const tones = {
    emerald: strong
      ? "from-emerald-600/90 via-emerald-500/85 to-teal-500/80 text-emerald-50 shadow-[0_18px_45px_rgba(5,150,105,0.28)]"
      : "from-emerald-400/20 to-emerald-200/5 text-emerald-100",
    cyan: strong
      ? "from-cyan-700/90 via-sky-600/85 to-cyan-500/80 text-cyan-50 shadow-[0_18px_45px_rgba(8,145,178,0.26)]"
      : "from-cyan-400/20 to-cyan-200/5 text-cyan-100",
    amber: strong
      ? "from-amber-500/92 via-yellow-500/86 to-amber-400/80 text-amber-50 shadow-[0_18px_45px_rgba(217,119,6,0.24)]"
      : "from-amber-400/20 to-amber-200/5 text-amber-100",
    rose: strong
      ? "from-rose-600/90 via-pink-500/84 to-rose-400/78 text-rose-50 shadow-[0_18px_45px_rgba(225,29,72,0.24)]"
      : "from-rose-400/20 to-rose-200/5 text-rose-100",
  };

  return (
    <div className={`rounded-[2rem] border ${strong ? "border-white/15" : "border-white/10"} bg-gradient-to-br ${tones[tone]} p-5`}>
      <p className={`text-xs uppercase tracking-[0.3em] ${strong ? "text-white/85" : "text-white/70"}`}>{label}</p>
      <p className={`mt-4 font-semibold text-white ${strong ? "text-[2.15rem] leading-tight" : "text-3xl"}`}>{value}</p>
      {hint ? <p className={`mt-3 text-sm ${strong ? "text-white/85" : "text-white/70"}`}>{hint}</p> : null}
    </div>
  );
}

export default StatCard;
