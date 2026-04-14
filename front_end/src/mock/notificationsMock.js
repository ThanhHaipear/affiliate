const notificationsMock = [
  {
    id: "noti-001",
    type: "approval",
    title: "Seller account approved",
    description: "Tài khoản seller của bạn đã được admin phê duyệt.",
    created_at: "2026-03-29T09:20:00+07:00",
    read: false,
  },
  {
    id: "noti-002",
    type: "commission",
    title: "Commission credited",
    description: "Một khoản hoa hồng mới đã được cộng vào ví affiliate.",
    created_at: "2026-03-28T16:50:00+07:00",
    read: true,
  },
  {
    id: "noti-003",
    type: "payout",
    title: "Withdrawal request processing",
    description: "Yêu cầu rút tiền đang được xử lý trong batch thanh toán tiếp theo.",
    created_at: "2026-03-27T10:30:00+07:00",
    read: false,
  },
];

export { notificationsMock };
