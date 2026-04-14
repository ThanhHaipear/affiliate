import DataTable from "../../../components/common/DataTable";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";

const payoutBatches = [
  { id: "batch-001", total_amount: "12,500,000 VND", beneficiary_count: 8, status: "PROCESSING" },
  { id: "batch-002", total_amount: "41,800,000 VND", beneficiary_count: 24, status: "PAID_OUT" },
];

function AdminPayoutBatchesPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Payout batches" description="Danh sách batch chi trả." />
      <DataTable
        columns={[
          { key: "id", title: "Batch" },
          { key: "total_amount", title: "Total Amount" },
          { key: "beneficiary_count", title: "Beneficiaries" },
          { key: "status", title: "Status", render: (row) => <StatusBadge status={row.status} /> },
        ]}
        rows={payoutBatches}
      />
    </div>
  );
}

export default AdminPayoutBatchesPage;
