import { cn } from "../../lib/utils";

const toneStyles = {
  cyan: "from-cyan-400/20 to-cyan-400/5 border-cyan-300/20",
  emerald: "from-emerald-400/20 to-emerald-400/5 border-emerald-300/20",
  amber: "from-amber-400/20 to-amber-400/5 border-amber-300/20",
  rose: "from-rose-400/20 to-rose-400/5 border-rose-300/20",
};

function AdminStatCard({ label, value, meta, tone = "cyan", tooltip = "" }) {
  return (
    <article
      title={tooltip || undefined}
      className={cn(
        "rounded-[2rem] border bg-gradient-to-br p-5 shadow-[0_20px_60px_rgba(2,12,27,0.35)]",
        toneStyles[tone],
      )}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-slate-300">{label}</p>
      <p className="mt-4 break-all text-[clamp(1.65rem,2vw,2.5rem)] font-semibold leading-tight text-white">
        {value}
      </p>
      {meta ? <p className="mt-3 text-sm text-slate-300">{meta}</p> : null}
    </article>
  );
}

export default AdminStatCard;
