import { useState } from "react";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import DataTable from "../../../components/common/DataTable";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";

const defaultAffiliateApprovals = [
  { id: "aa-001", channelName: "Creator Hub", owner: "creator@example.com", status: "PENDING" },
  { id: "aa-002", channelName: "Review Daily", owner: "review@example.com", status: "PENDING" },
];

function AdminAffiliateApprovalsPage({
  items = defaultAffiliateApprovals,
  onApprove = () => {},
  onReject = () => {},
}) {
  const [action, setAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const handleConfirm = () => {
    if (!action) {
      return;
    }

    if (action.type === "reject" && !rejectReason.trim()) {
      setReasonError("Reject reason is required.");
      return;
    }

    if (action.type === "approve") {
      onApprove(action.row);
    } else {
      onReject(action.row, rejectReason.trim());
    }

    setAction(null);
    setRejectReason("");
    setReasonError("");
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Affiliate approvals" description="Approve hoac reject affiliate bang ConfirmModal." />
      <DataTable
        columns={[
          { key: "channelName", title: "Channel" },
          { key: "owner", title: "Owner" },
          { key: "status", title: "Status", render: (row) => <StatusBadge status={row.status} /> },
          {
            key: "actions",
            title: "Actions",
            render: (row) => (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setAction({ type: "approve", row })}>Approve</Button>
                <Button size="sm" variant="danger" onClick={() => setAction({ type: "reject", row })}>Reject</Button>
              </div>
            ),
          },
        ]}
        rows={items}
      />
      <ConfirmModal
        open={Boolean(action)}
        title={action?.type === "approve" ? "Approve affiliate" : "Reject affiliate"}
        description={`Xac nhan ${action?.type || ""} affiliate ${action?.row?.channelName || ""}.`}
        confirmVariant={action?.type === "approve" ? "primary" : "danger"}
        onClose={() => {
          setAction(null);
          setRejectReason("");
          setReasonError("");
        }}
        onConfirm={handleConfirm}
      >
        {action?.type === "reject" ? (
          <Input
            label="Reject reason"
            value={rejectReason}
            onChange={(event) => {
              setRejectReason(event.target.value);
              if (reasonError) {
                setReasonError("");
              }
            }}
            error={reasonError}
          />
        ) : null}
      </ConfirmModal>
    </div>
  );
}

export default AdminAffiliateApprovalsPage;
