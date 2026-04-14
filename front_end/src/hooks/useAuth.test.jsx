import { act, renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "../store/authStore";

vi.mock("../api/authApi", () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: "",
      refreshToken: "",
      currentUser: null,
      roles: [],
      activeDashboardRole: null,
    });
  });

  it("reads current user and roles correctly", async () => {
    useAuthStore.setState({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      currentUser: {
        id: "user-1",
        email: "admin@example.com",
        phone: "0909",
        status: "ACTIVE",
        roles: ["admin"],
        profile: {},
      },
      roles: ["admin"],
    });

    const { useAuth } = await import("./useAuth");
    const { result } = renderHook(() => useAuth());

    expect(result.current.currentUser.email).toBe("admin@example.com");
    expect(result.current.roles).toEqual(["admin"]);
    expect(result.current.isAdmin).toBe(true);
  });

  it("login stores normalized session", async () => {
    const authApi = await import("../api/authApi");
    authApi.login.mockResolvedValue({
      accessToken: "access-2",
      refreshToken: "refresh-2",
      currentUser: {
        id: "user-2",
        email: "seller@example.com",
        phone: "0909",
        status: "ACTIVE",
        roles: ["seller"],
        profile: {},
      },
      roles: ["seller"],
    });

    const { useAuth } = await import("./useAuth");
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login({ email: "seller@example.com", password: "12345678" });
    });

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe("access-2");
    });
    expect(useAuthStore.getState().roles).toEqual(["seller"]);
  });

  it("logout clears state", async () => {
    const authApi = await import("../api/authApi");
    authApi.logout.mockResolvedValue({ loggedOut: true });

    useAuthStore.setState({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      currentUser: { id: "user-1", roles: ["affiliate"] },
      roles: ["affiliate"],
    });

    const { useAuth } = await import("./useAuth");
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(useAuthStore.getState().accessToken).toBe("");
    expect(useAuthStore.getState().roles).toEqual([]);
  });
});
