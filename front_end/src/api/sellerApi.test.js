import { describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("./axiosClient", () => ({
  axiosClient: {
    get: mockGet,
    post: mockPost,
    put: vi.fn(),
  },
}));

describe("sellerApi", () => {
  it("gets seller orders from backend orders endpoint", async () => {
    mockGet.mockResolvedValue({ data: { data: [{ id: "ord-1" }] } });
    const { getSellerOrders } = await import("./sellerApi");
    const result = await getSellerOrders({ page: 1 });

    expect(mockGet).toHaveBeenCalledWith("/api/orders", { params: { page: 1 } });
    expect(result).toEqual([{ id: "ord-1" }]);
  });

  it("confirms seller received money via payments endpoint", async () => {
    mockPost.mockResolvedValue({ data: { data: { settled: true } } });
    const { confirmSellerReceivedMoney } = await import("./sellerApi");
    const result = await confirmSellerReceivedMoney("ord-1");

    expect(mockPost).toHaveBeenCalledWith("/api/payments/ord-1/seller-confirm", {});
    expect(result).toEqual({ settled: true });
  });
});
