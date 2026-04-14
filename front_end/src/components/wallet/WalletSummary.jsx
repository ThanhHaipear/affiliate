import MoneyText from "../common/MoneyText";

function WalletSummary({
  title,
  availableBalance,
  processingAmount = 0,
  paidOutAmount = 0,
  processingLabel = "Processing",
  paidOutLabel = "Paid Out",
  titleClassName = "text-emerald-200",
  balanceClassName = "text-white",
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_30%),rgba(255,255,255,0.04)] p-6">
      <p className={`text-xs uppercase tracking-[0.3em] ${titleClassName}`}>{title}</p>
      <p className={`mt-4 text-4xl font-semibold ${balanceClassName}`}>
        <MoneyText value={availableBalance} />
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{processingLabel}</p>
          <p className="mt-2 text-lg font-medium text-white">
            <MoneyText value={processingAmount} />
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{paidOutLabel}</p>
          <p className="mt-2 text-lg font-medium text-white">
            <MoneyText value={paidOutAmount} />
          </p>
        </div>
      </div>
    </div>
  );
}

export default WalletSummary;
