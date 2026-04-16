import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { approveSeller, getAdminOverview, rejectSeller } from "../../api/adminApi";
import DetailPanel from "../../components/admin/DetailPanel";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminOverview } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

function AdminSellerDetailPage() {
  const toast = useToast();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [seller, setSeller] = useState(null);
  const [action, setAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadSeller();
  }, [id]);

  async function loadSeller() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminOverview();
      const match = mapAdminOverview(response).pendingSellers.find((item) => item.id === String(id));
      setSeller(match || null);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được chi tiết seller.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAction() {
    try {
      setSubmitting(true);
      if (action === "approve") {
        await approveSeller(seller.id);
        toast.success("Đã duyệt seller.");
      } else {
        await rejectSeller(seller.id, { rejectReason });
        toast.success("Đã từ chối seller.");
      }
      setAction(null);
      setRejectReason("");
      await loadSeller();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được seller.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} cards={2} />;
  }

  if (!seller) {
    return (
      <EmptyState
        title="Không tìm thấy seller"
        description={error || "Seller này không còn nằm trong danh sách chờ duyệt hoặc backend không trả về bản ghi."}
        actionLabel="Quay lại danh sách seller chờ duyệt"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chi tiết seller"
        title={seller.shopName}
        description={seller.description}
        action={
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => setAction("reject")}>
              Từ chối seller
            </Button>
            <Button onClick={() => setAction("approve")}>Duyệt seller</Button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DetailPanel eyebrow="Hồ sơ" title="Ảnh chụp doanh nghiệp">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="Chủ sở hữu" value={seller.ownerName} />
            <InfoItem label="Email" value={seller.email} />
            <InfoItem label="Số điện thoại" value={seller.phone} />
            <InfoItem label="Ngày gửi" value={formatDateTime(seller.submittedAt)} />
            <InfoItem label="Ngành hàng" value={seller.category} />
            <InfoItem label="Thanh toán" value={seller.paymentMethod} />
          </div>
        </DetailPanel>

        <DetailPanel eyebrow="Tuân thủ" title="Trạng thái review">
          <div className="flex flex-wrap gap-3">
            <StatusBadge status={seller.kycStatus} />
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-300">
              Rủi ro {seller.riskLevel}
            </span>
          </div>
          <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Tài liệu</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {seller.documents.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </DetailPanel>
      </div>
      <DetailPanel
        eyebrow="Hoạt động"
        title="Hành vi quan sát được"
        footer={
          <Link to="/admin/sellers/pending">
            <Button variant="secondary">Quay lại danh sách seller chờ duyệt</Button>
          </Link>
        }
      >
        <div className="space-y-3">
          {seller.activities.map((activity) => (
            <div key={activity} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              {activity}
            </div>
          ))}
        </div>
      </DetailPanel>
      <ConfirmModal
        open={Boolean(action)}
        title={action === "approve" ? "Duyệt seller" : "Từ chối seller"}
        description={`Xác nhận thao tác ${action === "approve" ? "duyệt" : "từ chối"} cho ${seller.shopName}.`}
        confirmVariant={action === "approve" ? "primary" : "danger"}
        onClose={() => {
          setAction(null);
          setRejectReason("");
        }}
        onConfirm={handleConfirmAction}
        loading={submitting}
      >
        {action === "reject" ? (
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

function InfoItem({ label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}

export default AdminSellerDetailPage;
