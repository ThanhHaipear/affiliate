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
      setError(loadError.response?.data?.message || "Khong tai duoc chi tiet affiliate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAction() {
    try {
      setSubmitting(true);
      if (action === "approve") {
        await approveAffiliate(affiliate.id);
        toast.success("Da duyet affiliate.");
      } else {
        await rejectAffiliate(affiliate.id, { rejectReason });
        toast.success("Da tu choi affiliate.");
      }
      setAction(null);
      setRejectReason("");
      await loadAffiliate();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc affiliate.");
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
        title="Affiliate not found"
        description={error || "Affiliate nay khong con nam trong danh sach cho duyet hoac backend khong tra ve ban ghi."}
        actionLabel="Back to pending affiliates"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate detail"
        title={affiliate.fullName}
        description={affiliate.description}
        action={
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => setAction("reject")}>
              Reject affiliate
            </Button>
            <Button onClick={() => setAction("approve")}>Approve affiliate</Button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DetailPanel eyebrow="Creator profile" title="Channel and payout data">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="Email" value={affiliate.email} />
            <InfoItem label="Phone" value={affiliate.phone} />
            <InfoItem label="Activity" value={affiliate.primaryChannel} />
            <InfoItem label="Submitted" value={formatDateTime(affiliate.submittedAt)} />
            <InfoItem label="Payout" value={affiliate.paymentMethod} />
            <InfoItem label="URL" value={affiliate.channelUrl} />
          </div>
        </DetailPanel>

        <DetailPanel eyebrow="Review notes" title="Moderation signals">
          <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Risk level</p>
            <p className="mt-2 text-sm text-white">{affiliate.riskLevel}</p>
          </div>
          <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Documents</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {affiliate.documents.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </DetailPanel>
      </div>
      <DetailPanel
        eyebrow="Activity"
        title="Observed actions"
        footer={
          <Link to="/admin/affiliates/pending">
            <Button variant="secondary">Back to pending affiliates</Button>
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
        title={action === "approve" ? "Approve affiliate" : "Reject affiliate"}
        description={`Confirm ${action || "review"} decision for ${affiliate.fullName}.`}
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

function InfoItem({ label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm text-white">{value}</p>
    </div>
  );
}

export default AdminAffiliateDetailPage;
