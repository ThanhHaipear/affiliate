import DataTable from "../common/DataTable";
import MoneyText from "../common/MoneyText";
import StatusBadge from "../common/StatusBadge";
import { formatDateTime } from "../../lib/format";

function OrderTable({ rows = [], showSellerConfirmation = false, actionsTitle = "Actions", renderActions }) {
  const columns = [
    { key: "code", title: "Order" },
    { key: "product_name", title: "Product" },
    { key: "amount", title: "Amount", render: (row) => <MoneyText value={row.amount} /> },
    { key: "order_status", title: "Order Status", render: (row) => <StatusBadge status={row.order_status} /> },
    { key: "payment_status", title: "Payment", render: (row) => <StatusBadge status={row.payment_status} /> },
    { key: "created_at", title: "Created", render: (row) => formatDateTime(row.created_at) },
  ];

  if (showSellerConfirmation) {
    columns.push({
      key: "seller_confirmed_received_money",
      title: "Order Completed",
      render: (row) => (
        <StatusBadge status={row.seller_confirmed_received_money ? "APPROVED" : "PENDING"} />
      ),
    });
  }

  if (renderActions) {
    columns.push({
      key: "actions",
      title: actionsTitle,
      render: (row) => renderActions(row),
    });
  }

  return <DataTable columns={columns} rows={rows} emptyTitle="Không có đơn hàng" />;
}

export default OrderTable;
