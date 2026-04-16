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
      setError(loadError.response?.data?.message || "Không tải được danh sách affiliate chờ duyệt.");
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
        toast.success("Đã duyệt affiliate.");
      } else {
        await rejectAffiliate(action.row.id, { rejectReason });
        toast.success("Đã từ chối affiliate.");
      }
      setAction(null);
      setRejectReason("");
      await loadAffiliates();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được trạng thái affiliate.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} cards={2} />;
  }

  if (error) {
    return <EmptyState title="Không tải được affiliate chờ duyệt" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Duyệt affiliate"
        title="Affiliate chờ duyệt"
        description="Danh sách này đang đọc trực tiếp từ backend. Chỉ nên duyệt khi affiliate đã có KYC và payment account hợp lệ."
      />
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm tên, email hoặc trạng thái hoạt động"
        filters={[
          {
            key: "channel",
            label: "Trạng thái hoạt động",
            value: channel,
            onChange: setChannel,
            options: [
              { label: "Tất cả trạng thái", value: "ALL" },
              { label: "Đang hoạt động", value: "ACTIVE" },
              { label: "Không hoạt động", value: "INACTIVE" },
              { label: "Đã khóa", value: "LOCKED" },
            ],
          },
        ]}
      />
      <DataTable
        columns={[
          { key: "fullName", title: "Affiliate" },
          { key: "primaryChannel", title: "Hoạt động" },
          { key: "paymentMethod", title: "Nhận chi trả" },
          { key: "submittedAt", title: "Ngày gửi", render: (row) => formatDateTime(row.submittedAt) },
          { key: "riskLevel", title: "Rủi ro" },
          {
            key: "actions",
            title: "Thao tác",
            render: (row) => (
              <div className="flex gap-2">
                <Link to={`/admin/affiliates/${row.id}`}>
                  <Button size="sm" variant="secondary">
                    Chi tiết
                  </Button>
                </Link>
                <Button size="sm" onClick={() => setAction({ type: "approve", row })}>
                  Duyệt
                </Button>
                <Button size="sm" variant="danger" onClick={() => setAction({ type: "reject", row })}>
                  Từ chối
                </Button>
              </div>
            ),
          },
        ]}
        rows={rows}
        keyField="rowKey"
        emptyTitle="Không còn affiliate chờ duyệt"
        emptyDescription="Backend hiện tại không trả về affiliate pending nào."
      />
      <ConfirmModal
        open={Boolean(action)}
        title={action?.type === "approve" ? "Duyệt affiliate" : "Từ chối affiliate"}
        description={`Xác nhận quyết định review cho ${action?.row?.fullName || ""}.`}
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
            label="Lý do từ chối"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Nêu rõ KYC hoặc bằng chứng nhận chi trả còn thiếu"
          />
        ) : null}
      </ConfirmModal>
    </div>
  );
}

export default AdminPendingAffiliatesPage;
