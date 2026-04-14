const sellerProductsMock = [
  {
    id: "seller-product-101",
    name: "Bo template livestream chuyen doi cao",
    category: "Digital Product",
    price: 890000,
    commissionValue: 15,
    productStatus: "APPROVED",
    affiliateStatus: "APPROVED",
    stock: 120,
    createdAt: "2026-03-20T09:30:00+07:00",
    orders: 34,
    revenue: 30260000,
    note: "San pham dang hoat dong tot tren kenh affiliate.",
  },
  {
    id: "seller-product-102",
    name: "Khoa hoc van hanh TikTok Shop",
    category: "Education",
    price: 1490000,
    commissionValue: 18,
    productStatus: "PENDING",
    affiliateStatus: "PENDING",
    stock: 999,
    createdAt: "2026-03-31T13:10:00+07:00",
    orders: 0,
    revenue: 0,
    note: "Dang cho admin duyet affiliate setting.",
  },
  {
    id: "seller-product-103",
    name: "Tai nghe bluetooth phien ban seller",
    category: "Electronics",
    price: 690000,
    commissionValue: 12,
    productStatus: "REJECTED",
    affiliateStatus: "REJECTED",
    stock: 18,
    createdAt: "2026-03-14T08:10:00+07:00",
    orders: 5,
    revenue: 3450000,
    note: "Can sua lai hinh anh va pricing truoc khi gui duyet lai.",
  },
  {
    id: "seller-product-104",
    name: "Combo dao tao affiliate cho seller",
    category: "Service",
    price: 3200000,
    commissionValue: 20,
    productStatus: "DRAFT",
    affiliateStatus: "PENDING",
    stock: 20,
    createdAt: "2026-04-02T10:45:00+07:00",
    orders: 0,
    revenue: 0,
    note: "Ban nhap dang duoc seller hoan thien noi dung.",
  },
];

const sellerPaymentsMock = [
  {
    id: "REC-2026-03-A",
    period: "01/03/2026 - 15/03/2026",
    grossRevenue: 42600000,
    platformFee: 2130000,
    affiliateCommission: 4685000,
    netAmount: 35785000,
    status: "COMPLETED",
    createdAt: "2026-03-16T12:00:00+07:00",
  },
  {
    id: "REC-2026-03-B",
    period: "16/03/2026 - 31/03/2026",
    grossRevenue: 51200000,
    platformFee: 2560000,
    affiliateCommission: 6110000,
    netAmount: 42530000,
    status: "PROCESSING",
    createdAt: "2026-04-01T11:30:00+07:00",
  },
];

const sellerNotificationsMock = [
  {
    id: "seller-noti-1",
    tone: "warning",
    title: "2 don hang dang cho xac nhan nhan tien",
    description: "He thong se chi ghi nhan hoa hong affiliate sau khi seller xac nhan da nhan tien.",
    createdAt: "2026-04-06T09:15:00+07:00",
  },
  {
    id: "seller-noti-2",
    tone: "success",
    title: "San pham Bo template livestream da duoc duyet affiliate",
    description: "San pham da san sang de affiliate tao link va day traffic.",
    createdAt: "2026-04-05T16:40:00+07:00",
  },
  {
    id: "seller-noti-3",
    tone: "danger",
    title: "Khoa hoc van hanh TikTok Shop can bo sung thong tin",
    description: "Admin yeu cau cap nhat pricing rationale truoc khi duyet tiep.",
    createdAt: "2026-04-04T14:20:00+07:00",
  },
];

function buildSellerOrderTimeline(order) {
  const payment = order.payments?.[0];
  const isRefunded = order.status === "REFUNDED" || order.payment_status === "REFUNDED";
  const isSettled = Boolean(order.sellerConfirmedReceivedMoney) || order.status === "COMPLETED";

  const events = [
    {
      id: `${order.id}-created`,
      label: "Đơn hàng đã tạo",
      time: order.createdAt,
      description: `Đơn ${order.orderCode || order.code} đã được tạo trong hệ thống.`,
    },
  ];

  if (payment?.paidAt || order.payment_status === "PAID" || order.status === "PAID") {
    events.push({
      id: `${order.id}-paid`,
      label: "Đã thanh toán",
      time: payment?.paidAt || order.updatedAt || order.createdAt,
      description: "Thanh toán của khách đã được ghi nhận thành công.",
    });
  }

  if (isRefunded) {
    events.push({
      id: `${order.id}-refunded`,
      label: "Đã hoàn tiền",
      time: order.updatedAt || order.createdAt,
      description: "Đơn hàng đã được hoàn tiền nên shop không nhận tiền và affiliate không được cộng hoa hồng.",
    });
    return events;
  }

  if (isSettled) {
    events.push({
      id: `${order.id}-settled`,
      label: "Đã chốt tiền",
      time: order.sellerConfirmedAt || order.updatedAt || order.createdAt,
      description: "Shop đã xác nhận nhận tiền. Hệ thống đã chốt tiền shop, phí sàn và hoa hồng affiliate nếu có.",
    });
    return events;
  }

  events.push({
    id: `${order.id}-waiting-settlement`,
    label: "Chờ shop xử lý",
    time: order.updatedAt || order.createdAt,
    description: "Đơn đang chờ shop chọn xác nhận đã nhận tiền hoặc hoàn tiền.",
  });

  return events;
}

export {
  buildSellerOrderTimeline,
  sellerNotificationsMock,
  sellerPaymentsMock,
  sellerProductsMock,
};
