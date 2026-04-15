const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

const statusLabelMap = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
  PENDING: "Đang chờ",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  PAID: "Đã thanh toán",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Đã chốt tiền",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
  ORDER_REFUND_REQUESTED: "Đang chờ duyệt hoàn tiền",
  ORDER_REFUND_REJECTED: "Yêu cầu hoàn tiền bị từ chối",
  WALLET_CREDITED: "Đã cộng ví",
  PAID_OUT: "Đã chi trả",
  OPEN: "Đang mở",
  RESOLVED: "Đã xử lý",
  HIGH: "Cao",
  MEDIUM: "Trung bình",
  LOW: "Thấp",
  PENDING_PAYMENT: "Chờ thanh toán",
  ORDER_PAID: "Đơn đã thanh toán",
};

function formatCurrency(value = 0) {
  return currencyFormatter.format(Number(value) || 0);
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  return dateTimeFormatter.format(new Date(value));
}

function formatStatusLabel(status = "") {
  const raw = String(status || "").trim();
  if (!raw) {
    return "--";
  }

  if (statusLabelMap[raw]) {
    return statusLabelMap[raw];
  }

  const normalized = raw.replace(/_/g, " ").toLowerCase();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export { formatCurrency, formatDateTime, formatStatusLabel };
