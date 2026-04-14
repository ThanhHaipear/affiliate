const storefrontCategories = [
  { id: "cat-beauty", name: "Lam dep", description: "Skincare, makeup, cham soc ca nhan", icon: "Spark" },
  { id: "cat-home", name: "Nha cua", description: "Do gia dung va san pham song xanh", icon: "Home" },
  { id: "cat-tech", name: "Cong nghe", description: "Phu kien, thiet bi, smart device", icon: "Chip" },
  { id: "cat-fashion", name: "Thoi trang", description: "Do mac hang ngay va phu kien", icon: "Bag" },
];

const topShops = [
  { id: "shop-01", name: "Glow Studio", rating: 4.9, followers: "18.2k", specialty: "Skincare premium" },
  { id: "shop-02", name: "Urban Nest", rating: 4.8, followers: "11.4k", specialty: "Do gia dung hien dai" },
  { id: "shop-03", name: "Nova Gear", rating: 4.7, followers: "9.1k", specialty: "Cong nghe va phu kien" },
];

const marketplaceProducts = [
  {
    id: "prod-001",
    name: "Tinh chat phuc hoi da 5D",
    slug: "tinh-chat-phuc-hoi-da-5d",
    category: "Lam dep",
    price: 690000,
    salePrice: 590000,
    seller_name: "Glow Studio",
    description: "Serum phuc hoi da de ban lai tren kenh social, dong goi dep va ty le quay lai cao.",
    longDescription:
      "Bo serum va kem khoa am duoc thiet ke cho routine phuc hoi nhanh. Seller da toi uu tai lieu truyen thong va hinh anh de affiliate co the tao noi dung nhanh.",
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=80",
    ],
    commission_type: "PERCENT",
    commission_value: 18,
    affiliate_enabled: true,
    approval_status: "APPROVED",
    affiliate_setting_status: "APPROVED",
    rating: 4.9,
    sold: 1240,
    shipping: "Giao nhanh trong 2-4 ngay",
    badges: ["Ban chay", "Affiliate manh", "Ho tro livestream"],
    seller: "shop-01",
  },
  {
    id: "prod-002",
    name: "Bo hop dung do nha bep toi gian",
    slug: "bo-hop-dung-do-nha-bep-toi-gian",
    category: "Nha cua",
    price: 420000,
    salePrice: 365000,
    seller_name: "Urban Nest",
    description: "Set dung do nha bep gon gang, anh lifestyle dep, de len combo cho KOC va creator.",
    longDescription:
      "San pham dan da tren san va co noi dung huong dan su dung ro rang. Phu hop cho affiliate lam content before-after va video to chuc nha cua.",
    image:
      "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    ],
    commission_type: "PERCENT",
    commission_value: 12,
    affiliate_enabled: true,
    approval_status: "APPROVED",
    affiliate_setting_status: "APPROVED",
    rating: 4.8,
    sold: 860,
    shipping: "Mien phi giao hang noi thanh",
    badges: ["Top shop", "Combo tot", "Video ngon"],
    seller: "shop-02",
  },
  {
    id: "prod-003",
    name: "Tai nghe bluetooth chong on AirLoop",
    slug: "tai-nghe-bluetooth-chong-on-airloop",
    category: "Cong nghe",
    price: 1490000,
    salePrice: 1290000,
    seller_name: "Nova Gear",
    description: "Tai nghe chong on chu dong, do chuyen doi cao tren kenh review va unbox.",
    longDescription:
      "San pham co review tot, chinh sach bao hanh ro rang va co thu vien anh/video san cho affiliate. Seller uu tien xac nhan don nhanh de commission duoc duyet som.",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80",
    ],
    commission_type: "PERCENT",
    commission_value: 15,
    affiliate_enabled: true,
    approval_status: "APPROVED",
    affiliate_setting_status: "APPROVED",
    rating: 4.7,
    sold: 520,
    shipping: "Bao hanh 12 thang toan quoc",
    badges: ["Cong nghe hot", "Review de len view"],
    seller: "shop-03",
  },
  {
    id: "prod-004",
    name: "Ao khoac linen form rong",
    slug: "ao-khoac-linen-form-rong",
    category: "Thoi trang",
    price: 550000,
    salePrice: 455000,
    seller_name: "Muse Daily",
    description: "Ao khoac linen he, anh chup lookbook sang va de mix do.",
    longDescription:
      "Form rong, mau de mac, seller co size chart ro rang. Affiliate co the tap trung vao content outfit va short-form styling.",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
    ],
    commission_type: "PERCENT",
    commission_value: 9,
    affiliate_enabled: true,
    approval_status: "APPROVED",
    affiliate_setting_status: "APPROVED",
    rating: 4.6,
    sold: 410,
    shipping: "Doi size trong 7 ngay",
    badges: ["Lookbook dep"],
    seller: "shop-04",
  },
  {
    id: "prod-005",
    name: "May xay mini smoothie BlendGo",
    slug: "may-xay-mini-smoothie-blendgo",
    category: "Nha cua",
    price: 890000,
    salePrice: 790000,
    seller_name: "Urban Nest",
    description: "May xay mini tien loi, phu hop content healthy lifestyle va routine buoi sang.",
    longDescription:
      "Mau sac tre trung, dong goi chac chan va co bo anh feed san cho affiliate. Ty le hoan thap va duoc seller uu tien xac nhan nhanh.",
    image:
      "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=1200&q=80",
    ],
    commission_type: "PERCENT",
    commission_value: 16,
    affiliate_enabled: true,
    approval_status: "APPROVED",
    affiliate_setting_status: "APPROVED",
    rating: 4.8,
    sold: 960,
    shipping: "Dong kiem hang truoc khi nhan",
    badges: ["Hoa hong cao", "Healthy content"],
    seller: "shop-02",
  },
  {
    id: "prod-006",
    name: "Den ngu thong minh Aura",
    slug: "den-ngu-thong-minh-aura",
    category: "Cong nghe",
    price: 790000,
    salePrice: 690000,
    seller_name: "Nova Gear",
    description: "Den ngu dieu khien bang app, de quay content phong ngu va desk setup.",
    longDescription:
      "San pham co nhieu ngach content: desk setup, decor, phong ngu. Chinh sach affiliate ro rang va seller ho tro media file san.",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    ],
    commission_type: "PERCENT",
    commission_value: 14,
    affiliate_enabled: true,
    approval_status: "APPROVED",
    affiliate_setting_status: "APPROVED",
    rating: 4.7,
    sold: 705,
    shipping: "Ho tro bao hanh va doi moi",
    badges: ["Desk setup", "Affiliate on dinh"],
    seller: "shop-03",
  },
];

const customerCart = [
  { id: "cart-1", productId: "prod-001", quantity: 1, variant: "Combo 30ml" },
  { id: "cart-2", productId: "prod-003", quantity: 1, variant: "Mau den" },
];

const customerOrders = [
  {
    id: "order-1001",
    code: "DH1001",
    product_name: "Tinh chat phuc hoi da 5D",
    amount: 590000,
    order_status: "COMPLETED",
    payment_status: "PAID",
    created_at: "2026-04-01T08:20:00.000Z",
    shipping_address: "Thu Duc, TP HCM",
  },
  {
    id: "order-1002",
    code: "DH1002",
    product_name: "May xay mini smoothie BlendGo",
    amount: 790000,
    order_status: "PROCESSING",
    payment_status: "PAID",
    created_at: "2026-04-04T09:40:00.000Z",
    shipping_address: "Go Vap, TP HCM",
  },
  {
    id: "order-1003",
    code: "DH1003",
    product_name: "Ao khoac linen form rong",
    amount: 455000,
    order_status: "PENDING",
    payment_status: "PENDING",
    created_at: "2026-04-05T15:10:00.000Z",
    shipping_address: "Bien Hoa, Dong Nai",
  },
];

const customerProfile = {
  fullName: "Nguyen Thi Minh Chau",
  email: "chau.nguyen@example.com",
  phone: "0908234567",
  passwordHint: "Cap nhat 45 ngay truoc",
  defaultAddress: "18 duong so 3, Linh Tay, Thu Duc, TP HCM",
  alternateAddress: "56 Phan Van Tri, Go Vap, TP HCM",
};

const affiliateDashboard = {
  clicks: 18240,
  generatedOrders: 318,
  pendingCommission: 24800000,
  approvedCommission: 17350000,
  availableBalance: 12100000,
};

const affiliateLinks = marketplaceProducts.slice(0, 4).map((product, index) => ({
  id: `link-${index + 1}`,
  productId: product.id,
  product: product.name,
  short_code: `AFF0${index + 1}`,
  clicks: [2410, 1820, 960, 640][index],
  conversionRate: [4.8, 3.6, 5.1, 2.9][index],
  url: `https://affiliate-demo.local/products/${product.id}?ref=AFF0${index + 1}`,
}));

const affiliateCommissions = [
  {
    id: "cm-01",
    order_code: "DH1001",
    product_name: "Tinh chat phuc hoi da 5D",
    pending_amount: 106200,
    actual_amount: 106200,
    status: "APPROVED",
    seller_confirmed_received_money: true,
    order_status: "COMPLETED",
    reason: "Seller da xac nhan nhan tien.",
  },
  {
    id: "cm-02",
    order_code: "DH1008",
    product_name: "May xay mini smoothie BlendGo",
    pending_amount: 126400,
    actual_amount: 0,
    status: "PENDING",
    seller_confirmed_received_money: false,
    order_status: "PROCESSING",
    reason: "Cho seller xac nhan da nhan tien.",
  },
  {
    id: "cm-03",
    order_code: "DH0988",
    product_name: "Den ngu thong minh Aura",
    pending_amount: 96600,
    actual_amount: 0,
    status: "REJECTED",
    seller_confirmed_received_money: false,
    order_status: "REFUNDED",
    reason: "Don hang da hoan tien.",
  },
];

const affiliateWithdrawals = [
  { id: "aw-001", amount: 2500000, status: "PROCESSING", requested_at: "2026-03-29" },
  { id: "aw-002", amount: 4000000, status: "PAID_OUT", requested_at: "2026-03-14" },
];

const sellerDashboard = {
  totalProducts: 16,
  totalOrders: 284,
  revenue: 428000000,
  payoutCommission: 36200000,
};

const sellerProducts = [
  {
    id: "sp-01",
    name: "Tinh chat phuc hoi da 5D",
    price: 590000,
    stock: 42,
    approval_status: "APPROVED",
    commission_type: "PERCENT",
    commission_value: 18,
    affiliate_setting_status: "APPROVED",
  },
  {
    id: "sp-02",
    name: "Mat na ngu collagen glow",
    price: 350000,
    stock: 88,
    approval_status: "PENDING",
    commission_type: "PERCENT",
    commission_value: 14,
    affiliate_setting_status: "PENDING",
  },
  {
    id: "sp-03",
    name: "Combo duong am 72h",
    price: 820000,
    stock: 23,
    approval_status: "APPROVED",
    commission_type: "PERCENT",
    commission_value: 16,
    affiliate_setting_status: "APPROVED",
  },
];

const sellerAffiliateOrders = [
  {
    id: "so-01",
    code: "DH2011",
    product_name: "Tinh chat phuc hoi da 5D",
    amount: 590000,
    order_status: "COMPLETED",
    payment_status: "PAID",
    created_at: "2026-04-03T09:10:00.000Z",
    seller_confirmed_received_money: true,
    affiliate_name: "Linh review",
  },
  {
    id: "so-02",
    code: "DH2018",
    product_name: "Combo duong am 72h",
    amount: 820000,
    order_status: "PROCESSING",
    payment_status: "PAID",
    created_at: "2026-04-05T14:40:00.000Z",
    seller_confirmed_received_money: false,
    affiliate_name: "Thu Ha KOC",
  },
];

const sellerWithdrawals = [
  { id: "sw-001", amount: 8000000, status: "PROCESSING", requested_at: "2026-03-28" },
  { id: "sw-002", amount: 5000000, status: "PAID_OUT", requested_at: "2026-03-12" },
];

function getProductById(productId) {
  return marketplaceProducts.find((product) => product.id === productId) || marketplaceProducts[0];
}

function getCartProducts() {
  return customerCart.map((item) => ({
    ...item,
    product: getProductById(item.productId),
  }));
}

export {
  affiliateCommissions,
  affiliateDashboard,
  affiliateLinks,
  affiliateWithdrawals,
  customerOrders,
  customerProfile,
  getCartProducts,
  getProductById,
  marketplaceProducts,
  sellerAffiliateOrders,
  sellerDashboard,
  sellerProducts,
  sellerWithdrawals,
  storefrontCategories,
  topShops,
};
