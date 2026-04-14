import DataTable from "../../../components/common/DataTable";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";

const fraudAlerts = [
  { id: "fraud-001", issue: "Unusual click burst from one IP range", severity: "PENDING", actor: "affiliate-001" },
  { id: "fraud-002", issue: "Refund rate spike in one seller campaign", severity: "PROCESSING", actor: "seller-001" },
];

function AdminFraudAlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Fraud alerts" description="Bảng cảnh báo gian lận." />
      <DataTable
        columns={[
          { key: "id", title: "Alert" },
          { key: "issue", title: "Issue" },
          { key: "actor", title: "Actor" },
          { key: "severity", title: "Status", render: (row) => <StatusBadge status={row.severity} /> },
        ]}
        rows={fraudAlerts}
      />
    </div>
  );
}

export default AdminFraudAlertsPage;
