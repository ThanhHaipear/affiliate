const customerAddresses = [
  {
    id: "addr-1",
    recipientName: "Nguyen Thi Lan",
    phone: "0901234567",
    province: "Ho Chi Minh",
    district: "Thu Duc",
    ward: "Linh Trung",
    detail: "45 Duong So 12, Khu pho 4",
    isDefault: true,
  },
  {
    id: "addr-2",
    recipientName: "Nguyen Thi Lan",
    phone: "0901234567",
    province: "Da Nang",
    district: "Hai Chau",
    ward: "Binh Hien",
    detail: "18 Nguyen Van Linh, Tang 5",
    isDefault: false,
  },
];

const customerNotifications = [
  {
    id: "noti-1",
    type: "ORDER",
    title: "Don hang #ORD-240915 da duoc giao",
    description: "Don hang cua ban da duoc cap nhat sang trang thai da giao thanh cong.",
    createdAt: "2026-04-05T08:30:00.000Z",
    unread: true,
  },
  {
    id: "noti-2",
    type: "PROMO",
    title: "Deal moi cho danh muc cong nghe",
    description: "Nhom shop cong nghe dang co uu dai freeship va gia tot trong 48 gio toi.",
    createdAt: "2026-04-04T03:15:00.000Z",
    unread: false,
  },
  {
    id: "noti-3",
    type: "SYSTEM",
    title: "Thong tin tai khoan da duoc cap nhat",
    description: "Ban vua cap nhat thong tin profile va dia chi giao hang mac dinh.",
    createdAt: "2026-04-03T10:00:00.000Z",
    unread: false,
  },
];

const customerWishlist = [
  {
    id: "wish-1",
    productId: 101,
    name: "Tai nghe khong day ANC",
    shopName: "Tech Space",
    price: 1290000,
    oldPrice: 1590000,
    image: "https://placehold.co/900x900?text=Wishlist+1",
    badge: "Yeu thich nhieu",
  },
  {
    id: "wish-2",
    productId: 102,
    name: "Noi chien khong dau 6L",
    shopName: "Home Living",
    price: 1890000,
    oldPrice: 0,
    image: "https://placehold.co/900x900?text=Wishlist+2",
    badge: "Gia tot",
  },
];

const shippingMethods = [
  { label: "Giao hang nhanh", value: "EXPRESS" },
  { label: "Tiet kiem", value: "STANDARD" },
];

export { customerAddresses, customerNotifications, customerWishlist, shippingMethods };
