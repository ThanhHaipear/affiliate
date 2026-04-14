import { describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("./axiosClient", () => ({
  axiosClient: {
    get: mockGet,
    post: mockPost,
  },
}));

describe("walletApi", () => {
  it("loads wallet summary from wallets endpoint", async () => {
    mockGet.mockResolvedValue({ data: { data: [{ id: "wallet-1" }] } });
    const { getWalletSummary } = await import("./walletApi");
    const result = await getWalletSummary();

    expect(mockGet).toHaveBeenCalledWith("/api/wallets/me", { params: undefined });
    expect(result).toEqual([{ id: "wallet-1" }]);
  });

  it("loads withdrawal context from withdrawal endpoint", async () => {
    mockGet.mockResolvedValue({ data: { data: { availableBalance: 100000 } } });
    const { getWithdrawalRequestContext } = await import("./walletApi");
    const result = await getWithdrawalRequestContext();

    expect(mockGet).toHaveBeenCalledWith("/api/withdrawals/me/context");
    expect(result).toEqual({ availableBalance: 100000 });
  });

  it("creates withdrawal request", async () => {
    mockPost.mockResolvedValue({ data: { data: { id: "wd-1" } } });
    const { createWithdrawalRequest } = await import("./walletApi");
    const result = await createWithdrawalRequest({ amount: 100000 });

    expect(mockPost).toHaveBeenCalledWith("/api/withdrawals", { amount: 100000 });
    expect(result).toEqual({ id: "wd-1" });
  });
});