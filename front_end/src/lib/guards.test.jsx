import { Routes, Route } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/test-utils";
import { useAuthStore } from "../store/authStore";
import { AuthGuard, RoleGuard } from "./guards";

function ProtectedPage() {
  return <div>Protected content</div>;
}

function UnauthorizedPage() {
  return <div>Unauthorized page</div>;
}

function LoginPage() {
  return <div>Login page</div>;
}

describe("guards", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: "",
      refreshToken: "",
      currentUser: null,
      roles: [],
    });
  });

  it("auth guard blocks unauthenticated user", () => {
    renderWithProviders(
      <Routes>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route path="/dashboard" element={<ProtectedPage />} />
        </Route>
      </Routes>,
      { route: "/dashboard" },
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("role guard blocks wrong role", () => {
    useAuthStore.setState({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      currentUser: { id: "user-1", roles: ["customer"] },
      roles: ["customer"],
    });

    renderWithProviders(
      <Routes>
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<RoleGuard allowedRoles={["admin"]} />}>
            <Route path="/dashboard/admin" element={<ProtectedPage />} />
          </Route>
        </Route>
      </Routes>,
      { route: "/dashboard/admin" },
    );

    expect(screen.getByText("Unauthorized page")).toBeInTheDocument();
  });

  it("allows matching role", () => {
    useAuthStore.setState({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      currentUser: { id: "user-1", roles: ["admin"] },
      roles: ["admin"],
    });

    renderWithProviders(
      <Routes>
        <Route element={<AuthGuard />}>
          <Route element={<RoleGuard allowedRoles={["admin"]} />}>
            <Route path="/dashboard/admin" element={<ProtectedPage />} />
          </Route>
        </Route>
      </Routes>,
      { route: "/dashboard/admin" },
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
