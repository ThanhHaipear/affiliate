import { useAuthStore } from "./authStore";

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: "",
      refreshToken: "",
      currentUser: null,
      roles: [],
      activeDashboardRole: null,
    });
  });

  it("login sets tokens and user correctly", () => {
    useAuthStore.getState().login({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      currentUser: {
        id: "user-1",
        email: "seller@example.com",
        phone: "0909",
        status: "ACTIVE",
        roles: ["seller"],
        profile: {},
      },
      roles: ["seller"],
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("access-1");
    expect(state.refreshToken).toBe("refresh-1");
    expect(state.currentUser.email).toBe("seller@example.com");
    expect(state.roles).toEqual(["seller"]);
    expect(state.activeDashboardRole).toBe("seller");
  });

  it("preserves chosen dashboard role when still available", () => {
    useAuthStore.setState({
      activeDashboardRole: "customer",
      roles: ["customer", "affiliate"],
    });

    useAuthStore.getState().setUser({
      id: "user-1",
      email: "customer@example.com",
      phone: "0909",
      status: "ACTIVE",
      roles: ["customer", "affiliate"],
      profile: {},
    });

    expect(useAuthStore.getState().activeDashboardRole).toBe("customer");
  });

  it("prioritizes customer dashboard on login when customer capability is available", () => {
    useAuthStore.getState().login({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      currentUser: {
        id: "user-1",
        email: "hybrid@example.com",
        phone: "0909",
        status: "ACTIVE",
        roles: ["affiliate", "customer"],
        profile: {
          hasCustomerCapability: true,
          hasAffiliateCapability: true,
        },
      },
      roles: ["affiliate", "customer"],
    });

    expect(useAuthStore.getState().activeDashboardRole).toBe("customer");
  });

  it("logout clears auth state", () => {
    useAuthStore.setState({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      currentUser: { id: "user-1", roles: ["admin"] },
      roles: ["admin"],
      activeDashboardRole: "admin",
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("");
    expect(state.refreshToken).toBe("");
    expect(state.currentUser).toBeNull();
    expect(state.roles).toEqual([]);
    expect(state.activeDashboardRole).toBeNull();
  });
});
