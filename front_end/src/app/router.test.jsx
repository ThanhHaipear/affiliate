import { cleanup, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { createTestRouter } from "./router";
import { AUTH_STORAGE_KEY, useAuthStore } from "../store/authStore";
import { createTestQueryClient } from "../test/test-utils";

async function syncPersistedAuth(sessionState) {
  if (sessionState) {
    sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        state: sessionState,
        version: 0,
      }),
    );
  } else {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }

  await useAuthStore.persist.rehydrate();
}

async function seedAuthSession({ accessToken, refreshToken, currentUser, roles, activeDashboardRole = null }) {
  const sessionState = {
    accessToken,
    refreshToken,
    currentUser,
    roles,
    activeDashboardRole,
  };

  await syncPersistedAuth(sessionState);
}

describe("app router", () => {
  beforeEach(async () => {
    cleanup();
    useAuthStore.setState({
      accessToken: "",
      refreshToken: "",
      currentUser: null,
      roles: [],
      activeDashboardRole: null,
    });
    await syncPersistedAuth(null);
  });

  function renderRoute(pathname) {
    const testRouter = createTestRouter([pathname]);
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>,
    );
    return testRouter;
  }

  it("renders public route correctly", async () => {
    renderRoute("/");

    expect(
      await screen.findByRole("link", {
        name: (name) => name.includes("Khám phá sản phẩm"),
      }),
    ).toBeInTheDocument();
  });

  it("blocks protected route for unauthenticated user", async () => {
    renderRoute("/dashboard/seller");

    expect(
      await screen.findByRole("heading", { name: /Dang nhap|Đăng nhập/i }),
    ).toBeInTheDocument();
  });

  it("allows admin route only for admin", async () => {
    await seedAuthSession({
      accessToken: "token",
      refreshToken: "refresh",
      currentUser: { id: "1", roles: ["admin"], profile: {} },
      roles: ["admin"],
      activeDashboardRole: "admin",
    });

    renderRoute("/dashboard/admin");

    expect(await screen.findByText("Admin overview")).toBeInTheDocument();
  });

  it("allows seller route only for seller", async () => {
    await seedAuthSession({
      accessToken: "token",
      refreshToken: "refresh",
      currentUser: { id: "1", roles: ["seller"], profile: {} },
      roles: ["seller"],
      activeDashboardRole: "seller",
    });

    renderRoute("/dashboard/seller");

    expect(await screen.findByRole("heading", { name: /Tổng quan seller/i })).toBeInTheDocument();
  });

  it("allows affiliate route only for affiliate", async () => {
    await seedAuthSession({
      accessToken: "token",
      refreshToken: "refresh",
      currentUser: { id: "1", roles: ["affiliate"], profile: { affiliateStatus: "PENDING" } },
      roles: ["affiliate"],
      activeDashboardRole: "affiliate",
    });

    renderRoute("/dashboard/affiliate");

    expect(await screen.findByText("Affiliate dashboard")).toBeInTheDocument();
  });

  it("allows customer route only for customer", async () => {
    await seedAuthSession({
      accessToken: "token",
      refreshToken: "refresh",
      currentUser: { id: "1", roles: ["customer"], profile: {} },
      roles: ["customer"],
      activeDashboardRole: "customer",
    });

    renderRoute("/dashboard/customer/profile");

    expect(
      await screen.findByRole("heading", { name: /Xin chào|Hồ sơ khách hàng/i }),
    ).toBeInTheDocument();
  });

  it("redirects wrong role to unauthorized", async () => {
    await seedAuthSession({
      accessToken: "token",
      refreshToken: "refresh",
      currentUser: { id: "1", roles: ["customer"], profile: {} },
      roles: ["customer"],
      activeDashboardRole: "customer",
    });

    renderRoute("/dashboard/admin");

    expect(
      await screen.findByRole("heading", {
        name: /Ban khong co quyen truy cap|Bạn không có quyền truy cập/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders not found route", async () => {
    renderRoute("/missing-page");

    expect(
      await screen.findByRole("heading", { name: /Trang khong ton tai|Trang không tồn tại/i }),
    ).toBeInTheDocument();
  });
});
