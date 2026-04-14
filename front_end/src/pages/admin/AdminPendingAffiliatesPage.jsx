import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { approveAffiliate, getAdminOverview, rejectAffiliate } from "../../api/adminApi";
import FilterBar from "../../components/admin/FilterBar";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../hooks/useToast";
import { mapAdminOverview } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

function AdminPendingAffiliatesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pendingAffiliates, setPendingAffiliates] = useState([]);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("ALL");
  const [action, setAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadAffiliates();
  }, []);

  async function loadAffiliates() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminOverview();
      setPendingAffiliates(mapAdminOverview(response).pendingAffiliates);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Khong tai duoc danh sach affiliate cho duyet.");
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => {
    return pendingAffiliates.filter((affiliate) => {
      const matchesSearch = [affiliate.fullName, affiliate.email, affiliate.primaryChannel]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesChannel = channel === "ALL" || affiliate.primaryChannel === channel;
      return matchesSearch && matchesChannel;
    });
  }, [channel, pendingAffiliates, search]);

  async function handleConfirmAction() {
    if (!action?.row) {
      return;
    }

    try {
      setSubmitting(true);
      if (action.type === "approve") {
        await approveAffiliate(action.row.id);
        toast.success("Da duyet affiliate.");
      } else {
        await rejectAffiliate(action.row.id, { rejectReason });
        toast.success("Da tu choi affiliate.");
      }
      setAction(null);
      setRejectReason("");
      await loadAffiliates();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc trang thai affiliate.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} cards={2} />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc affiliate pending" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate review"
        title="Pending affiliates"
        description="Danh sach nay dang doc truc tiep tu backend. Approve chi nen duoc thuc hien khi affiliate da co KYC va payment account hop le."
      />
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, or activity status"
        filters={[
          {
            key: "channel",
            label: "Activity status",
            value: channel,
            onChange: setChannel,
            options: [
              { label: "All statuses", value: "ALL" },
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
              { label: "Locked", value: "LOCKED" },
            ],
          },
        ]}
      />
      <DataTable
        columns={[
          { key: "fullName", title: "Affiliate" },
          { key: "primaryChannel", title: "Activity" },
          { key: "paymentMethod", title: "Payout" },
          { key: "submittedAt", title: "Submitted", render: (row) => formatDateTime(row.submittedAt) },
          { key: "riskLevel", title: "Risk" },
          {
            key: "actions",
            title: "Actions",
            render: (row) => (
              <div className="flex gap-2">
                <Link to={`/admin/affiliates/${row.id}`}>
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
        emptyTitle="Khong con affiliate cho duyet"
        emptyDescription="Backend hien tai khong tra ve affiliate pending nao."
      />
      <ConfirmModal
        open={Boolean(action)}
        title={action?.type === "approve" ? "Approve affiliate" : "Reject affiliate"}
        description={`Review decision for ${action?.row?.fullName || ""}.`}
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
            placeholder="Specify missing KYC or payout evidence"
          />
        ) : null}
      </ConfirmModal>
    </div>
  );
}

export default AdminPendingAffiliatesPage;
