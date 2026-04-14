import { describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();

vi.mock("./axiosClient", () => ({
  axiosClient: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    patch: mockPatch,
  },
}));

describe("affiliateApi", () => {
  it("creates affiliate link using tracking endpoint", async () => {
    mockPost.mockResolvedValue({ data: { data: { shortCode: "AFF001" } } });
    const { createAffiliateLink } = await import("./affiliateApi");
    const result = await createAffiliateLink({ productId: "prod-1" });

    expect(mockPost).toHaveBeenCalledWith("/api/tracking/links", { productId: "prod-1" });
    expect(result).toEqual({ shortCode: "AFF001" });
  });

  it("revokes affiliate link using tracking endpoint", async () => {
    mockPatch.mockResolvedValue({ data: { data: { id: 9, status: "REVOKED" } } });
    const { revokeAffiliateLink } = await import("./affiliateApi");
    const result = await revokeAffiliateLink(9);

    expect(mockPatch).toHaveBeenCalledWith("/api/tracking/links/9/revoke");
    expect(result).toEqual({ id: 9, status: "REVOKED" });
  });

  it("loads affiliate commissions from commissions endpoint", async () => {
    mockGet.mockResolvedValue({ data: { data: [{ id: "com-1" }] } });
    const { getAffiliateCommissions } = await import("./affiliateApi");
    const result = await getAffiliateCommissions();

    expect(mockGet).toHaveBeenCalledWith("/api/commissions/me", { params: undefined });
    expect(result).toEqual([{ id: "com-1" }]);
  });

  it("uploads affiliate avatar using upload endpoint", async () => {
    mockPost.mockResolvedValueOnce({ data: { data: [{ url: "https://cdn.example.com/avatar.jpg" }] } });
    const { uploadAffiliateAvatar } = await import("./affiliateApi");
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const result = await uploadAffiliateAvatar(file);

    expect(mockPost).toHaveBeenCalledWith(
      "/api/uploads/images",
      expect.any(FormData),
      expect.objectContaining({
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),
    );
    expect(result).toEqual({ url: "https://cdn.example.com/avatar.jpg" });
  });

  it("updates affiliate profile using affiliate endpoint", async () => {
    mockPut.mockResolvedValueOnce({ data: { data: { accountId: 7, fullName: "Customer Test" } } });
    const { updateAffiliateProfile } = await import("./affiliateApi");
    const payload = { fullName: "Customer Test", phone: "03796894089" };
    const result = await updateAffiliateProfile(payload);

    expect(mockPut).toHaveBeenCalledWith("/api/affiliate/profile", payload);
    expect(result).toEqual({ accountId: 7, fullName: "Customer Test" });
  });

  it("adds affiliate payment account using affiliate endpoint", async () => {
    mockPost.mockResolvedValueOnce({ data: { data: { id: "payment-1" } } });
    const { addAffiliatePaymentAccount } = await import("./affiliateApi");
    const payload = { type: "BANK_TRANSFER", accountName: "Nguyen Van A" };
    const result = await addAffiliatePaymentAccount(payload);

    expect(mockPost).toHaveBeenCalledWith("/api/affiliate/payment-accounts", payload);
    expect(result).toEqual({ id: "payment-1" });
  });
});
