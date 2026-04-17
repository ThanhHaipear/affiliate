import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { confirmVnpayReturn } from "../../api/orderApi";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../hooks/useToast";

function VnpayReturnPage() {
  const location = useLocation();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const toastRef = useRef(toast);

  const payload = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    let active = true;

    async function verifyReturn() {
      if (!payload.vnp_TxnRef || !payload.vnp_SecureHash) {
        setError("Thiếu dữ liệu trả về từ VNPAY.");
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
          toastRef.current.success("VNPAY xác nhận giao dịch thành công.");
        } else {
          toastRef.current.error("VNPAY trả về trạng thái chưa thanh toán thành công.");
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message = loadError.response?.data?.message || "Không xác minh được kết quả VNPAY.";
        setError(message);
        toastRef.current.error(message);
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
  }, [location.search, payload]);

  if (loading) {
    return (
      <EmptyState
        title="Đang xác minh giao dịch"
        description="Hệ thống đang kiểm tra checksum và trạng thái trả về từ VNPAY."
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Thanh toán" title="Không xác minh được giao dịch" description={error} />
        <div className="flex gap-3">
          <Link to="/dashboard/customer/orders">
            <Button variant="secondary">Về danh sách đơn hàng</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Thanh toán"
        title={result?.success ? "Giao dịch thành công" : "Thanh toán chưa thành công"}
        description={
          result?.success
            ? "Giao dịch đã được xác nhận thành công. Bạn có thể chọn nút điều hướng bên dưới."
            : "Bạn có thể quay về đơn hàng để thanh toán lại hoặc kiểm tra trạng thái."
        }
      />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Mã đơn: <span className="font-semibold text-slate-900">{result?.orderId}</span>
          </p>
          <p>
            Mã phản hồi VNPAY: <span className="font-semibold text-slate-900">{result?.responseCode || "--"}</span>
          </p>
          <p>
            Mã giao dịch VNPAY: <span className="font-semibold text-slate-900">{result?.transactionNo || "--"}</span>
          </p>
          <p>
            Ngân hàng: <span className="font-semibold text-slate-900">{result?.bankCode || "--"}</span>
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <Link to="/">
            <Button>Về trang chủ</Button>
          </Link>
          <Link to="/dashboard/customer/orders">
            <Button variant="secondary">Về danh sách đơn</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VnpayReturnPage;
