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
  COMPLETED: "Đơn đã hoàn tất",
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

function formatCompactCurrency(value = 0) {
  const amount = Number(value) || 0;
  const absoluteAmount = Math.abs(amount);

  const units = [
    { threshold: 1e15, label: "triệu tỷ" },
    { threshold: 1e12, label: "nghìn tỷ" },
    { threshold: 1e9, label: "tỷ" },
    { threshold: 1e6, label: "triệu" },
    { threshold: 1e3, label: "nghìn" },
  ];

  for (const unit of units) {
    if (absoluteAmount >= unit.threshold) {
      const scaled = amount / unit.threshold;
      const rounded = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1);
      return `${rounded.replace(/\.0$/, "")} ${unit.label} đ`;
    }
  }

  return formatCurrency(amount);
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

export { formatCompactCurrency, formatCurrency, formatDateTime, formatStatusLabel };
