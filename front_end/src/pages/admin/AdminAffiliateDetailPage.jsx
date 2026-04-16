import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { approveAffiliate, getAdminOverview, rejectAffiliate } from "../../api/adminApi";
import DetailPanel from "../../components/admin/DetailPanel";
import LoadingSkeleton from "../../components/admin/LoadingSkeleton";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../hooks/useToast";
import { mapAdminOverview } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

function AdminAffiliateDetailPage() {
  const toast = useToast();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [affiliate, setAffiliate] = useState(null);
  const [action, setAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadAffiliate();
  }, [id]);

  async function loadAffiliate() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminOverview();
      const match = mapAdminOverview(response).pendingAffiliates.find((item) => item.id === String(id));
      setAffiliate(match || null);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được chi tiết affiliate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAction() {
    try {
      setSubmitting(true);
      if (action === "approve") {
        await approveAffiliate(affiliate.id);
        toast.success("Đã duyệt affiliate.");
      } else {
        await rejectAffiliate(affiliate.id, { rejectReason });
        toast.success("Đã từ chối affiliate.");
      }
      setAction(null);
      setRejectReason("");
      await loadAffiliate();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được affiliate.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} cards={2} />;
  }

  if (!affiliate) {
    return (
      <EmptyState
        title="Không tìm thấy affiliate"
        description={error || "Affiliate này không còn nằm trong danh sách chờ duyệt hoặc backend không trả về bản ghi."}
        actionLabel="Quay lại danh sách affiliate chờ duyệt"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chi tiết affiliate"
        title={affiliate.fullName}
        description={affiliate.description}
        action={
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => setAction("reject")}>
              Từ chối affiliate
            </Button>
            <Button onClick={() => setAction("approve")}>Duyệt affiliate</Button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DetailPanel eyebrow="Hồ sơ creator" title="Kênh hoạt động và dữ liệu nhận chi trả">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="Email" value={affiliate.email} />
            <InfoItem label="Số điện thoại" value={affiliate.phone} />
            <InfoItem label="Hoạt động" value={affiliate.primaryChannel} />
            <InfoItem label="Ngày gửi" value={formatDateTime(affiliate.submittedAt)} />
            <InfoItem label="Nhận chi trả" value={affiliate.paymentMethod} />
            <InfoItem label="URL" value={affiliate.channelUrl} />
          </div>
        </DetailPanel>

        <DetailPanel eyebrow="Ghi chú review" title="Tín hiệu kiểm duyệt">
          <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Mức rủi ro</p>
            <p className="mt-2 text-sm text-white">{affiliate.riskLevel}</p>
          </div>
          <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Tài liệu</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {affiliate.documents.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </DetailPanel>
      </div>
      <DetailPanel
        eyebrow="Hoạt động"
        title="Hành động quan sát được"
        footer={
          <Link to="/admin/affiliates/pending">
            <Button variant="secondary">Quay lại danh sách affiliate chờ duyệt</Button>
          </Link>
        }
      >
        <div className="space-y-3">
          {affiliate.activities.map((activity) => (
            <div key={activity} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              {activity}
            </div>
          ))}
        </div>
      </DetailPanel>
      <ConfirmModal
        open={Boolean(action)}
        title={action === "approve" ? "Duyệt affiliate" : "Từ chối affiliate"}
        description={`Xác nhận thao tác ${action === "approve" ? "duyệt" : "từ chối"} cho ${affiliate.fullName}.`}
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
            placeholder="Nêu rõ KYC hoặc bằng chứng nhận chi trả còn thiếu"
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
      <p className="mt-2 break-all text-sm text-white">{value}</p>
    </div>
  );
}

export default AdminAffiliateDetailPage;
