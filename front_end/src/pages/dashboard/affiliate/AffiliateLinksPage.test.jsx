import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import AffiliateLinksPage from "./AffiliateLinksPage";
import { renderWithProviders } from "../../../test/test-utils";

const {
  mockGetAffiliateLinks,
  mockRevokeAffiliateLink,
  mockUnrevokeAffiliateLink,
} = vi.hoisted(() => ({
  mockGetAffiliateLinks: vi.fn(),
  mockRevokeAffiliateLink: vi.fn(),
  mockUnrevokeAffiliateLink: vi.fn(),
}));

vi.mock("../../../api/affiliateApi", () => ({
  getAffiliateLinks: mockGetAffiliateLinks,
  revokeAffiliateLink: mockRevokeAffiliateLink,
  unrevokeAffiliateLink: mockUnrevokeAffiliateLink,
}));

describe("AffiliateLinksPage", () => {
  it("paginates affiliate links with 8 items per page", async () => {
    const user = userEvent.setup();

    mockGetAffiliateLinks.mockResolvedValue(
      Array.from({ length: 9 }, (_, index) => ({
        id: index + 1,
        shortCode: `CODE-${index + 1}`,
        status: "ACTIVE",
        createdAt: `2026-01-0${Math.min(index + 1, 9)}T00:00:00.000Z`,
        productId: index + 1,
        clicks: Array.from({ length: index }, () => ({})),
        orderItems: Array.from({ length: index }, () => ({})),
        product: {
          id: index + 1,
          name: `Sản phẩm ${index + 1}`,
          description: "Mô tả",
          basePrice: 100000,
          status: "APPROVED",
          seller: { shopName: "Shop A" },
          images: [{ url: "/demo.jpg" }],
          variants: [{ id: index + 1, price: 100000, inventory: { quantity: 10, reservedQuantity: 0 } }],
          affiliateSetting: {
            isEnabled: true,
            approvalStatus: "APPROVED",
            commissionValue: 10,
          },
          category: { name: "Danh mục" },
        },
      })),
    );

    renderWithProviders(<AffiliateLinksPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Sản phẩm 1").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Sản phẩm 8").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sản phẩm 9")).not.toBeInTheDocument();
    expect(screen.getByText("Trang 1 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sau" }));

    expect(screen.getAllByText("Sản phẩm 9").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sản phẩm 1")).not.toBeInTheDocument();
    expect(screen.getByText("Trang 2 / 2")).toBeInTheDocument();
  });
});
