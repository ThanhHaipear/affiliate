import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { approveSeller, getAdminOverview, rejectSeller } from "../../api/adminApi";
import FilterBar from "../../components/admin/FilterBar";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminOverview } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

function AdminPendingSellersPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pendingSellers, setPendingSellers] = useState([]);
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("ALL");
  const [action, setAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadSellers();
  }, []);

  async function loadSellers() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminOverview();
      setPendingSellers(mapAdminOverview(response).pendingSellers);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Khong tai duoc danh sach seller cho duyet.");
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => {
    return pendingSellers.filter((seller) => {
      const matchesSearch = [seller.shopName, seller.ownerName, seller.email]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesRisk = risk === "ALL" || seller.riskLevel === risk;
      return matchesSearch && matchesRisk;
    });
  }, [pendingSellers, risk, search]);

  async function handleConfirmAction() {
    if (!action?.row) {
      return;
    }

    try {
      setSubmitting(true);
      if (action.type === "approve") {
        await approveSeller(action.row.id);
        toast.success("Da duyet seller.");
      } else {
        await rejectSeller(action.row.id, { rejectReason });
        toast.success("Da tu choi seller.");
      }
      setAction(null);
      setRejectReason("");
      await loadSellers();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc trang thai seller.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} cards={2} />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc seller pending" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller review"
        title="Pending sellers"
        description="Danh sach nay dang doc truc tiep tu backend. Approve chi nen duoc thuc hien khi seller da co KYC va tai khoan nhan tien hop le."
      />
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search shop, owner, or email"
        filters={[
          {
            key: "risk",
            label: "Risk",
            value: risk,
            onChange: setRisk,
            options: [
              { label: "All risk levels", value: "ALL" },
              { label: "Low", value: "LOW" },
              { label: "Medium", value: "MEDIUM" },
              { label: "High", value: "HIGH" },
            ],
          },
        ]}
      />
      <DataTable
        columns={[
          { key: "shopName", title: "Shop" },
          { key: "ownerName", title: "Owner" },
          { key: "category", title: "Category" },
          { key: "submittedAt", title: "Submitted", render: (row) => formatDateTime(row.submittedAt) },
          { key: "riskLevel", title: "Risk", render: (row) => row.riskLevel },
          { key: "kycStatus", title: "KYC", render: (row) => <StatusBadge status={row.kycStatus} /> },
          {
            key: "actions",
            title: "Actions",
            render: (row) => (
              <div className="flex gap-2">
                <Link to={`/admin/sellers/${row.id}`}>
                  <Button size="sm" variant="secondary">
                    Detail
                  </Button>
                </Link>
                <Button size="sm" onClick={() => setAction({ type: "approve", row })}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => setAction({ type: "reject", row })}>
                  Reject
                </Button>
              </div>
            ),
          },
        ]}
        rows={rows}
        keyField="rowKey"
        emptyTitle="Khong con seller cho duyet"
        emptyDescription="Backend hien tai khong tra ve seller pending nao."
      />
      <ConfirmModal
        open={Boolean(action)}
        title={action?.type === "approve" ? "Approve seller" : "Reject seller"}
        description={`Review decision for ${action?.row?.shopName || ""}.`}
        confirmVariant={action?.type === "approve" ? "primary" : "danger"}
        onClose={() => {
          setAction(null);
          setRejectReason("");
        }}
        onConfirm={handleConfirmAction}
        loading={submitting}
      >
        {action?.type === "reject" ? (
          <Input
            label="Reject reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Explain what is missing or invalid"
          />
        ) : null}
      </ConfirmModal>
    </div>
  );
}

export default AdminPendingSellersPage;
