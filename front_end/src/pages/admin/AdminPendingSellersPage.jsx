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
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminOverview } from "../../lib/adminMappers";
import { formatDateTime, formatStatusLabel } from "../../lib/format";

const SELLERS_PER_PAGE = 8;

const riskOptions = [
  { label: "Tất cả mức rủi ro", value: "ALL" },
  { label: "Thấp", value: "LOW" },
  { label: "Trung bình", value: "MEDIUM" },
  { label: "Cao", value: "HIGH" },
];

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
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadSellers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [risk, search]);

  async function loadSellers() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminOverview();
      setPendingSellers(mapAdminOverview(response).pendingSellers);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được danh sách người bán chờ duyệt.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    return pendingSellers.filter((seller) => {
      const matchesSearch = [seller.shopName, seller.ownerName, seller.email]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesRisk = risk === "ALL" || seller.riskLevel === risk;
      return matchesSearch && matchesRisk;
    });
  }, [pendingSellers, risk, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / SELLERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * SELLERS_PER_PAGE;
    return filteredRows.slice(startIndex, startIndex + SELLERS_PER_PAGE);
  }, [currentPage, filteredRows]);

  async function handleConfirmAction() {
    if (!action?.row) {
      return;
    }

    try {
      setSubmitting(true);
      if (action.type === "approve") {
        await approveSeller(action.row.id);
        toast.success("Đã duyệt người bán.");
      } else {
        await rejectSeller(action.row.id, { rejectReason });
        toast.success("Đã từ chối người bán.");
      }
      setAction(null);
      setRejectReason("");
      await loadSellers();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được trạng thái người bán.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} cards={2} />;
  }

  if (error) {
    return <EmptyState title="Không tải được người bán chờ duyệt" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Duyệt người bán"
        title="Người bán chờ duyệt"
        description="Chỉ nên duyệt khi người bán đã có KYC và tài khoản nhận tiền hợp lệ."
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm shop, chủ sở hữu hoặc email"
        filters={[
          {
            key: "risk",

            value: risk,
            onChange: setRisk,
            options: riskOptions,
          },
        ]}
      />

      <DataTable
        columns={[
          { key: "shopName", title: "Shop" },
          { key: "ownerName", title: "Chủ sở hữu" },
          { key: "category", title: "Ngành hàng" },
          { key: "submittedAt", title: "Ngày gửi", render: (row) => formatDateTime(row.submittedAt) },
          {
            key: "riskLevel",
            title: "Rủi ro",
            render: (row) => formatStatusLabel(row.riskLevel),
          },
          { key: "kycStatus", title: "KYC", render: (row) => <StatusBadge status={row.kycStatus} /> },
          {
            key: "actions",
            title: "Thao tác",
            render: (row) => (
              <div className="flex gap-2">
                <Link to={`/admin/sellers/${row.id}`}>
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
        rows={paginatedRows}
        keyField="rowKey"
        emptyTitle="Không còn người bán chờ duyệt"
        emptyDescription="Backend hiện tại không trả về người bán pending nào."
      />

      {filteredRows.length > SELLERS_PER_PAGE ? (
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      ) : null}

      <ConfirmModal
        open={Boolean(action)}
        title={action?.type === "approve" ? "Duyệt người bán" : "Từ chối người bán"}
        description={`Xác nhận quyết định review cho ${action?.row?.shopName || ""}.`}
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
            placeholder="Nêu rõ phần còn thiếu hoặc không hợp lệ"
          />
        ) : null}
      </ConfirmModal>
    </div>
  );
}

export default AdminPendingSellersPage;
