import { describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("./axiosClient", () => ({
  axiosClient: {
    get: mockGet,
    post: mockPost,
    delete: vi.fn(),
  },
}));

describe("orderApi", () => {
  it("loads cart from cart endpoint", async () => {
    mockGet.mockResolvedValue({ data: { data: { items: [] } } });
    const { getCart } = await import("./orderApi");
    const result = await getCart();

    expect(mockGet).toHaveBeenCalledWith("/api/cart");
    expect(result).toEqual({ items: [] });
  });

  it("creates checkout order from cart checkout endpoint", async () => {
    mockPost.mockResolvedValue({ data: { data: { id: "ord-1" } } });
    const { createCheckoutOrder } = await import("./orderApi");
    const result = await createCheckoutOrder({ receiverName: "User" });

    expect(mockPost).toHaveBeenCalledWith("/api/cart/checkout", {
      receiverName: "User",
    });
    expect(result).toEqual({ id: "ord-1" });
  });
});
