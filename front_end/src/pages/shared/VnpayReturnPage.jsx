import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { confirmPayoutBatchVnpayReturn } from "../../api/adminApi";
import { confirmVnpayReturn } from "../../api/orderApi";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../hooks/useToast";

const verificationCache = new Map();
const STORAGE_PREFIX = "affiliate-platform:vnpay-return:";
const STORAGE_TTL_MS = 10 * 60 * 1000;
const PENDING_WAIT_TIMEOUT_MS = 15_000;
const PENDING_WAIT_POLL_MS = 150;

function createDisplayError(message, sourceError) {
  const error = sourceError instanceof Error ? sourceError : new Error(message);
  error.displayMessage = message;
  return error;
}

function getStorageKey(requestKey) {
  return `${STORAGE_PREFIX}${requestKey}`;
}

function getSharedStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function readStoredVerification(requestKey) {
  const storage = getSharedStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(getStorageKey(requestKey));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const storedAt = Number(parsed?.storedAt || 0);
    if (!storedAt || Date.now() - storedAt > STORAGE_TTL_MS) {
      storage.removeItem(getStorageKey(requestKey));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredVerification(requestKey, entry) {
  const storage = getSharedStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      getStorageKey(requestKey),
      JSON.stringify({
        ...entry,
        storedAt: Date.now(),
      }),
    );
  } catch {
    // Ignore storage write failures and fall back to in-memory caching.
  }
}

function syncStoredVerificationFlags(requestKey, flags) {
  const stored = readStoredVerification(requestKey);
  if (!stored) {
    return;
  }

  writeStoredVerification(requestKey, {
    ...stored,
    ...flags,
  });
}

function hydrateVerificationCache(requestKey) {
  const cached = verificationCache.get(requestKey);
  if (cached) {
    return cached;
  }

  const stored = readStoredVerification(requestKey);
  if (!stored) {
    return null;
  }

  if (stored.status === "fulfilled") {
    const entry = {
      status: "fulfilled",
      value: stored.value,
      successToastShown: Boolean(stored.successToastShown),
      failureToastShown: Boolean(stored.failureToastShown),
    };
    verificationCache.set(requestKey, entry);
    return entry;
  }

  if (stored.status === "rejected") {
    const error = createDisplayError(stored.errorMessage || "Không xác minh được kết quả VNPAY.");
    const entry = {
      status: "rejected",
      error,
      successToastShown: Boolean(stored.successToastShown),
      failureToastShown: Boolean(stored.failureToastShown),
    };
    verificationCache.set(requestKey, entry);
    return entry;
  }

  return null;
}

function delay(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

async function waitForStoredVerification(requestKey) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < PENDING_WAIT_TIMEOUT_MS) {
    const stored = readStoredVerification(requestKey);

    if (!stored) {
      return null;
    }

    if (stored.status === "fulfilled" || stored.status === "rejected") {
      verificationCache.delete(requestKey);
      return hydrateVerificationCache(requestKey);
    }

    await delay(PENDING_WAIT_POLL_MS);
  }

  return null;
}

async function resolveVerificationOnce(requestKey, requestFactory) {
  const hydrated = hydrateVerificationCache(requestKey);
  if (hydrated?.status === "fulfilled") {
    return hydrated.value;
  }

  if (hydrated?.status === "rejected") {
    throw hydrated.error;
  }

  const stored = readStoredVerification(requestKey);
  if (stored?.status === "pending") {
    const resolvedEntry = await waitForStoredVerification(requestKey);

    if (resolvedEntry?.status === "fulfilled") {
      return resolvedEntry.value;
    }

    if (resolvedEntry?.status === "rejected") {
      throw resolvedEntry.error;
    }
  }

  const cached = verificationCache.get(requestKey);
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = requestFactory()
    .then((value) => {
      const nextEntry = {
        ...verificationCache.get(requestKey),
        status: "fulfilled",
        value,
        promise: null,
      };
      verificationCache.set(requestKey, nextEntry);
      writeStoredVerification(requestKey, {
        status: "fulfilled",
        value,
        successToastShown: Boolean(nextEntry.successToastShown),
        failureToastShown: Boolean(nextEntry.failureToastShown),
      });
      return value;
    })
    .catch((error) => {
      const message =
        error.displayMessage || error.response?.data?.message || "Không xác minh được kết quả VNPAY.";
      const nextError = createDisplayError(message, error);
      const nextEntry = {
        ...verificationCache.get(requestKey),
        status: "rejected",
        error: nextError,
        promise: null,
      };
      verificationCache.set(requestKey, nextEntry);
      writeStoredVerification(requestKey, {
        status: "rejected",
        errorMessage: message,
        successToastShown: Boolean(nextEntry.successToastShown),
        failureToastShown: Boolean(nextEntry.failureToastShown),
      });
      throw nextError;
    });

  const pendingEntry = {
    status: "pending",
    promise,
    successToastShown: false,
    failureToastShown: false,
  };
  verificationCache.set(requestKey, pendingEntry);
  writeStoredVerification(requestKey, {
    status: "pending",
    successToastShown: false,
    failureToastShown: false,
  });

  return promise;
}

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
  const requestKey = `${isPayoutFlow ? "payout" : "order"}:${location.search}`;

  const payload = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const entries = Object.fromEntries(params.entries());

    return Object.keys(entries).reduce((resultObject, key) => {
      if (key.startsWith("vnp_")) {
        resultObject[key] = entries[key];
      }

      return resultObject;
    }, {});
  }, [location.search]);

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

        const response = await resolveVerificationOnce(requestKey, () =>
          isPayoutFlow ? confirmPayoutBatchVnpayReturn(payload) : confirmVnpayReturn(payload),
        );

        if (!active) {
          return;
        }

        setResult(response);

        const cacheEntry = verificationCache.get(requestKey);

        if (response.success && !cacheEntry?.successToastShown) {
          const nextEntry = {
            ...cacheEntry,
            successToastShown: true,
          };
          verificationCache.set(requestKey, nextEntry);
          syncStoredVerificationFlags(requestKey, { successToastShown: true });
          toastRef.current.success(
            isPayoutFlow
              ? "VNPAY xác nhận chi trả payout batch thành công."
              : "VNPAY xác nhận giao dịch thành công.",
          );
          return;
        }

        if (!response.success && !cacheEntry?.failureToastShown) {
          const nextEntry = {
            ...cacheEntry,
            failureToastShown: true,
          };
          verificationCache.set(requestKey, nextEntry);
          syncStoredVerificationFlags(requestKey, { failureToastShown: true });
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

        const message =
          loadError.displayMessage ||
          loadError.response?.data?.message ||
          (isPayoutFlow
            ? "Không xác minh được kết quả payout VNPAY."
            : "Không xác minh được kết quả VNPAY.");

        setError(message);

        const cacheEntry = verificationCache.get(requestKey);
        if (!cacheEntry?.failureToastShown) {
          const nextEntry = {
            ...cacheEntry,
            failureToastShown: true,
            error: createDisplayError(message, loadError),
          };
          verificationCache.set(requestKey, nextEntry);
          syncStoredVerificationFlags(requestKey, {
            failureToastShown: true,
            errorMessage: message,
          });
          toastRef.current.error(message);
        }
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
  }, [isPayoutFlow, payload, requestKey]);

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
            <span className="font-semibold text-slate-900">{result?.batchId || result?.orderCode || result?.orderId}</span>
          </p>
          {!isPayoutFlow && result?.totalOrders > 1 ? (
            <p>
              Số order trong checkout: <span className="font-semibold text-slate-900">{result.totalOrders}</span>
            </p>
          ) : null}
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
