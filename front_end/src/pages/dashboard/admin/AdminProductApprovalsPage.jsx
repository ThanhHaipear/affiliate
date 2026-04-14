import { useState } from "react";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import DataTable from "../../../components/common/DataTable";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { productsMock } from "../../../mock/productsMock";

function AdminProductApprovalsPage({
  items = productsMock,
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
      <PageHeader eyebrow="Admin" title="Product approvals" description="Approve hoac reject san pham hoac affiliate setting." />
      <DataTable
        columns={[
          { key: "name", title: "Product" },
          { key: "seller_name", title: "Seller" },
          { key: "approval_status", title: "Product", render: (row) => <StatusBadge status={row.approval_status} /> },
          { key: "affiliate_setting_status", title: "Affiliate Setting", render: (row) => <StatusBadge status={row.affiliate_setting_status} /> },
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
        title={action?.type === "approve" ? "Approve item" : "Reject item"}
        description={`Xac nhan ${action?.type || ""} ${action?.row?.name || ""}.`}
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

export default AdminProductApprovalsPage;
