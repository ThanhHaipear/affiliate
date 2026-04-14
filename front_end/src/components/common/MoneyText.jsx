import { formatCurrency } from "../../lib/format";

function MoneyText({ value, className = "" }) {
  return <span className={className}>{formatCurrency(value)}</span>;
}

export default MoneyText;
