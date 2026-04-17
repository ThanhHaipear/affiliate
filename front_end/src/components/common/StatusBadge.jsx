import { formatStatusLabel } from "../../lib/format";
import { cn } from "../../lib/utils";

const statusStyles = {
  ACTIVE: "bg-emerald-50 text-emerald-800",
  LOCKED: "bg-rose-50 text-rose-800",
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-sky-50 text-sky-800",
  REJECTED: "bg-rose-50 text-rose-800",
  REVOKED: "bg-rose-50 text-rose-800",
  PAID: "bg-emerald-50 text-emerald-800",
  PROCESSING: "bg-cyan-50 text-cyan-800",
  COMPLETED: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-slate-100 text-slate-700",
  REFUNDED: "bg-orange-50 text-orange-800",
  ORDER_REFUND_REQUESTED: "bg-amber-50 text-amber-800",
  ORDER_REFUND_REJECTED: "bg-rose-50 text-rose-800",
  WALLET_CREDITED: "bg-violet-50 text-violet-800",
  PAID_OUT: "bg-fuchsia-50 text-fuchsia-800",
  OPEN: "bg-rose-50 text-rose-800",
  RESOLVED: "bg-emerald-50 text-emerald-800",
  HIGH: "bg-rose-50 text-rose-800",
  MEDIUM: "bg-amber-50 text-amber-800",
  LOW: "bg-sky-50 text-sky-800",
};

function StatusBadge({ status, className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium",
        statusStyles[status] || "bg-slate-100 text-slate-700",
        className,
      )}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

export default StatusBadge;
