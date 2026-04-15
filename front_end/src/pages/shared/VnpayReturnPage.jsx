import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { confirmVnpayReturn } from "../../api/orderApi";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../hooks/useToast";

function VnpayReturnPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const processedSearchRef = useRef("");

  const payload = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  useEffect(() => {
    let active = true;
    const searchKey = location.search;

    // Prevent duplicate verification in React StrictMode and repeated rerenders.
    if (processedSearchRef.current === searchKey) {
      return () => {
        active = false;
      };
    }

    processedSearchRef.current = searchKey;

    async function verifyReturn() {
      if (!payload.vnp_TxnRef || !payload.vnp_SecureHash) {
        setError("Thieu du lieu tra ve tu VNPAY.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await confirmVnpayReturn(payload);
        if (!active) {
          return;
        }

        setResult(response);
        if (response.success) {
          toast.success("VNPAY xac nhan giao dich thanh cong.");
        } else {
          toast.error("VNPAY tra ve trang thai chua thanh toan thanh cong.");
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message = loadError.response?.data?.message || "Khong xac minh duoc ket qua VNPAY.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    verifyReturn();

    return () => {
      active = false;
    };
  }, [location.search, payload, toast]);

  useEffect(() => {
    if (!result?.orderId || !result?.success) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(`/dashboard/customer/orders/${result.orderId}`, { replace: true });
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, result]);

  if (loading) {
    return (
      <EmptyState
        title="Dang xac minh giao dich"
        description="He thong dang kiem tra checksum va trang thai tra ve tu VNPAY."
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Thanh toan" title="Khong xac minh duoc giao dich" description={error} />
        <div className="flex gap-3">
          <Link to="/dashboard/customer/orders">
            <Button variant="secondary">Ve danh sach don hang</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Thanh toan"
        title={result?.success ? "Thanh toan thanh cong" : "Thanh toan chua thanh cong"}
        description={
          result?.success
            ? "He thong dang chuyen ban ve trang chi tiet don hang."
            : "Ban co the quay ve don hang de thanh toan lai hoac kiem tra trang thai."
        }
      />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Ma don: <span className="font-semibold text-slate-900">{result?.orderId}</span>
          </p>
          <p>
            Ma phan hoi VNPAY: <span className="font-semibold text-slate-900">{result?.responseCode || "--"}</span>
          </p>
          <p>
            Ma giao dich VNPAY: <span className="font-semibold text-slate-900">{result?.transactionNo || "--"}</span>
          </p>
          <p>
            Ngan hang: <span className="font-semibold text-slate-900">{result?.bankCode || "--"}</span>
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <Link to={`/dashboard/customer/orders/${result?.orderId || ""}`}>
            <Button>Xem don hang</Button>
          </Link>
          <Link to="/dashboard/customer/orders">
            <Button variant="secondary">Ve danh sach don</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VnpayReturnPage;
