import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductDetailPage from "./ProductDetailPage";

const mockNavigate = vi.fn();
const mockUpdateCartItem = vi.fn();
const mockGetProductDetail = vi.fn();
const mockTrackAffiliateClick = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

let mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ productId: "10" }),
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

vi.mock("../../api/productApi", () => ({
  getProductDetail: (...args) => mockGetProductDetail(...args),
}));

vi.mock("../../api/orderApi", () => ({
  updateCartItem: (...args) => mockUpdateCartItem(...args),
}));

vi.mock("../../api/trackingApi", () => ({
  trackAffiliateClick: (...args) => mockTrackAffiliateClick(...args),
}));

vi.mock("../../api/affiliateApi", () => ({
  createAffiliateLink: vi.fn(),
}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

vi.mock("../../hooks/useRole", () => ({
  useRole: () => ({
    isAffiliate: false,
    isCustomer: true,
  }),
}));

vi.mock("../../store/authStore", () => ({
  useAuthStore: (selector) => selector({ currentUser: null }),
}));

vi.mock("../../lib/wishlist", () => ({
  isWishlisted: () => false,
  toggleWishlist: () => [],
}));

describe("ProductDetailPage cart attribution", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUpdateCartItem.mockReset();
    mockGetProductDetail.mockReset();
    mockTrackAffiliateClick.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockSearchParams = new URLSearchParams();

    mockGetProductDetail.mockResolvedValue({
      id: 10,
      name: "Sản phẩm A",
      description: "Mô tả",
      basePrice: 100000,
      status: "APPROVED",
      seller: { id: 1, shopName: "Shop A" },
      category: { name: "Danh mục A" },
      affiliateSetting: { isEnabled: true, commissionType: "PERCENT", commissionValue: 10 },
      variants: [{ id: 101, price: 100000, variantName: "Mặc định", inventory: { quantity: 10, reservedQuantity: 0 } }],
      images: [{ url: "https://example.com/product.jpg" }],
    });
    mockUpdateCartItem.mockResolvedValue({ id: 123 });
  });

  it("does not send attributionToken when user enters from home without ref", async () => {
    localStorage.setItem(
      "affiliate-platform-attribution",
      JSON.stringify({
        "10": {
          shortCode: "AFF123",
          token: "token-old",
          affiliateId: 99,
          affiliateLinkId: 88,
        },
      }),
    );

    render(<ProductDetailPage />);

    const button = await screen.findByRole("button", { name: /thêm vào giỏ hàng/i });
    fireEvent.click(button);

    await waitFor(() => expect(mockUpdateCartItem).toHaveBeenCalledTimes(1));
    expect(mockUpdateCartItem).toHaveBeenCalledWith({
      productId: 10,
      variantId: 101,
      quantity: 1,
      attributionToken: undefined,
    });

    expect(JSON.parse(localStorage.getItem("affiliate-platform-attribution") || "{}")).toEqual({});
  });

  it("sends attributionToken when user enters from affiliate link", async () => {
    mockSearchParams = new URLSearchParams("ref=AFF123");
    mockTrackAffiliateClick.mockResolvedValue({
      attribution: { token: "token-new" },
      link: { affiliateId: 99, id: 88 },
    });

    render(<ProductDetailPage />);

    const button = await screen.findByRole("button", { name: /thêm vào giỏ hàng/i });
    fireEvent.click(button);

    await waitFor(() => expect(mockUpdateCartItem).toHaveBeenCalledTimes(1));
    expect(mockTrackAffiliateClick).toHaveBeenCalledTimes(1);
    expect(mockUpdateCartItem).toHaveBeenCalledWith({
      productId: 10,
      variantId: 101,
      quantity: 1,
      attributionToken: "token-new",
    });
  });
});
