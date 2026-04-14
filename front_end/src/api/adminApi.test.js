import { describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock("./axiosClient", () => ({
  axiosClient: {
    get: mockGet,
    patch: mockPatch,
  },
}));

describe("adminApi", () => {
  it("loads admin overview from dashboard endpoint", async () => {
    mockGet.mockResolvedValue({ data: { data: { total_users: 10 } } });
    const { getAdminOverview } = await import("./adminApi");
    const result = await getAdminOverview();

    expect(mockGet).toHaveBeenCalledWith("/api/admin/dashboard");
    expect(result).toEqual({ total_users: 10 });
  });

  it("approves seller via review endpoint", async () => {
    mockPatch.mockResolvedValue({ data: { data: { status: "APPROVED" } } });
    const { approveSeller } = await import("./adminApi");
    const result = await approveSeller("seller-1");

    expect(mockPatch).toHaveBeenCalledWith("/api/admin/sellers/seller-1/review", {
      status: "APPROVED",
    });
    expect(result).toEqual({ status: "APPROVED" });
  });
});
