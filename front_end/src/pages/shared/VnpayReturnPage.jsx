import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { confirmPayoutBatchVnpayReturn } from "../../api/adminApi";
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
  const flow = searchParams.get("flow") || "";
  const isPayoutFlow = flow === "payout-batch";

  const payload = useMemo(() => {
    const entries = Object.fromEntries(searchParams.entries());
    return Object.keys(entries).reduce((resultObject, key) => {
      if (key.startsWith("vnp_")) {
        resultObject[key] = entries[key];
      }
      return resultObject;
    }, {});
  }, [searchParams]);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    let active = true;

    async function verifyReturn() {
      if (!payload.vnp_TxnRef || !payload.vnp_SecureHash) {
        setError(isPayoutFlow ? "Thiếu dữ liệu trả về từ VNPAY cho payout batch." : "Thiếu dữ liệu trả về từ VNPAY.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = isPayoutFlow
          ? await confirmPayoutBatchVnpayReturn(payload)
          : await confirmVnpayReturn(payload);
        if (!active) {
          return;
        }

        setResult(response);
        if (response.success) {
          toastRef.current.success(
            isPayoutFlow
              ? "VNPAY xác nhận chi trả payout batch thành công."
              : "VNPAY xác nhận giao dịch thành công.",
          );
        } else {
          toastRef.current.error(
            isPayoutFlow
              ? "VNPAY trả về trạng thái chi trả chưa thành công."
              : "VNPAY trả về trạng thái chưa thanh toán thành công.",
          );
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message = loadError.response?.data?.message || (isPayoutFlow
          ? "Không xác minh được kết quả payout VNPAY."
          : "Không xác minh được kết quả VNPAY.");
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
  }, [isPayoutFlow, location.search, payload]);

  if (loading) {
    return (
      <EmptyState
        title={isPayoutFlow ? "Đang xác minh payout batch" : "Đang xác minh giao dịch"}
        description={
          isPayoutFlow
            ? "Hệ thống đang kiểm tra checksum và trạng thái chi trả từ VNPAY sandbox."
            : "Hệ thống đang kiểm tra checksum và trạng thái trả về từ VNPAY."
        }
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={isPayoutFlow ? "Payout" : "Thanh toan"}
          title={isPayoutFlow ? "Không xác minh được payout batch" : "Không xác minh được giao dịch"}
          description={error}
        />
        <div className="flex gap-3">
          <Link to={isPayoutFlow ? "/admin/withdrawals/pending" : "/dashboard/customer/orders"}>
            <Button variant="secondary">
              {isPayoutFlow ? "Về duyệt rút tiền" : "Về danh sách đơn hàng"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isPayoutFlow ? "Payout" : "Thanh toán"}
        title={
          result?.success
            ? isPayoutFlow
              ? "Chi trả thành công"
              : "Giao dịch thành công"
            : isPayoutFlow
              ? "Chi trả chưa thành công"
              : "Thanh toán chưa thành công"
        }
        description={
          result?.success
            ? isPayoutFlow
              ? "Payout batch đã được xác minh thành công qua VNPAY sandbox."
              : "Giao dịch đã được xác nhận thành công."
            : isPayoutFlow
              ? "Bạn có thể quay lại admin để thử thanh toán lại payout batch."
              : "Bạn có thể quay về đơn hàng để thanh toán lại hoặc kiểm tra trạng thái."
        }
      />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            {isPayoutFlow ? "Mã batch" : "Mã đơn"}:{" "}
            <span className="font-semibold text-slate-900">{result?.batchId || result?.orderId}</span>
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
          {isPayoutFlow ? (
            <>
              <Link to="/admin/withdrawals/pending">
                <Button>Về duyệt rút tiền</Button>
              </Link>
              <Link to="/admin/commissions">
                <Button variant="secondary">Về payout batches</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/">
                <Button>Về trang chủ</Button>
              </Link>
              <Link to="/dashboard/customer/orders">
                <Button variant="secondary">Về danh sách đơn</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VnpayReturnPage;
