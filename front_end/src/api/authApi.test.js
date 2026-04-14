import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPost = vi.fn();

vi.mock("./axiosClient", () => ({
  axiosClient: {
    post: mockPost,
  },
}));

describe("authApi", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_USE_MOCK_AUTH", "false");
    mockPost.mockReset();
  });

  it("calls login endpoint and normalizes response", async () => {
    mockPost.mockResolvedValue({
      data: {
        data: {
          accessToken: "access-1",
          refreshToken: "refresh-1",
          account: {
            id: "1",
            email: "admin@example.com",
            phone: "0909",
            status: "ACTIVE",
            roles: ["ADMIN"],
          },
        },
      },
    });

    const { login } = await import("./authApi");
    const result = await login({ email: "admin@example.com", password: "12345678" });

    expect(mockPost).toHaveBeenCalledWith("/api/auth/login", {
      email: "admin@example.com",
      password: "12345678",
    });
    expect(result.roles).toEqual(["admin"]);
    expect(result.currentUser.email).toBe("admin@example.com");
  });

  it("calls refresh endpoint and normalizes response", async () => {
    mockPost.mockResolvedValue({
      data: {
        data: {
          accessToken: "access-2",
          refreshToken: "refresh-2",
          account: { id: "2", roles: ["SELLER"], status: "ACTIVE" },
        },
      },
    });

    const { refreshSession } = await import("./authApi");
    const result = await refreshSession({ refreshToken: "refresh-1" });

    expect(mockPost).toHaveBeenCalledWith("/api/auth/refresh-token", {
      refreshToken: "refresh-1",
    });
    expect(result.roles).toEqual(["seller"]);
  });
});
