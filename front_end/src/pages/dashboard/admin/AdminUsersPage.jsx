import { useState } from "react";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import DataTable from "../../../components/common/DataTable";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { mockUsers } from "../../../mock/authMock";

function AdminUsersPage() {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Users management" description="Khóa và mở khóa tài khoản người dùng." />
      <DataTable
        columns={[
          { key: "email", title: "Email" },
          { key: "phone", title: "Phone" },
          { key: "roles", title: "Roles", render: (row) => row.roles.join(", ") },
          { key: "status", title: "Status", render: (row) => <StatusBadge status={row.status} /> },
          {
            key: "actions",
            title: "Actions",
            render: (row) => (
              <Button size="sm" variant={row.status === "LOCKED" ? "primary" : "danger"} onClick={() => setSelectedUser(row)}>
                {row.status === "LOCKED" ? "Unlock" : "Lock"}
              </Button>
            ),
          },
        ]}
        rows={mockUsers}
      />
      <ConfirmModal
        open={Boolean(selectedUser)}
        title={selectedUser?.status === "LOCKED" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
        description={`Xác nhận thao tác với ${selectedUser?.email || ""}.`}
        onClose={() => setSelectedUser(null)}
        onConfirm={() => setSelectedUser(null)}
      />
    </div>
  );
}

export default AdminUsersPage;
