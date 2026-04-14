import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RegisterSellerPage from "./RegisterSellerPage";

vi.mock("../../api/authApi", () => ({
  register: vi.fn(),
}));

const toast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../../hooks/useToast", () => ({
  useToast: () => toast,
}));

describe("RegisterSellerPage", () => {
  it("validates required fields", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterSellerPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /Gui dang ky seller/i }));

    expect(
      await screen.findByText(
        (content) => /business/i.test(content) && /bat buoc|báº¯t buá»™c/i.test(content),
      ),
    ).toBeInTheDocument();
  });

  it("submits valid data and shows pending message", async () => {
    const user = userEvent.setup();
    const onRegisterSuccess = vi.fn();
    const authApi = await import("../../api/authApi");
    authApi.register.mockResolvedValue({});

    render(
      <MemoryRouter>
        <RegisterSellerPage onRegisterSuccess={onRegisterSuccess} />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/Ho ten/i), "Seller One");
    await user.type(screen.getByLabelText(/^Email/i), "seller@example.com");
    await user.type(screen.getByLabelText(/So dien thoai/i), "0901234567");
    await user.type(screen.getByLabelText(/Ten business/i), "Seller Business");
    await user.type(screen.getByLabelText(/Ten shop/i), "Seller Shop");
    await user.type(screen.getByLabelText(/^Ngan hang/i), "VCB");
    await user.type(screen.getByLabelText(/Ten chu tai khoan/i), "Seller One");
    await user.type(screen.getByLabelText(/So tai khoan/i), "123456789");
    await user.type(screen.getByLabelText(/^Mat khau/i), "12345678");
    await user.type(screen.getByLabelText(/Xac nhan mat khau/i), "12345678");

    await user.click(screen.getByRole("button", { name: /Gui dang ky seller/i }));

    await waitFor(() => expect(authApi.register).toHaveBeenCalledTimes(1));
    expect(authApi.register).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "SELLER",
        fullName: "Seller One",
        businessName: "Seller Business",
        shopName: "Seller Shop",
        paymentMethod: "BANK_TRANSFER",
        bankName: "VCB",
        bankAccountName: "Seller One",
        bankAccountNumber: "123456789",
      }),
    );
    expect(onRegisterSuccess).toHaveBeenCalled();
    expect(screen.getByText(/He thong da luu san thong tin shop va tai khoan thanh toan/i)).toBeInTheDocument();
  });

  it("shows backend error when registration fails", async () => {
    const user = userEvent.setup();
    const authApi = await import("../../api/authApi");
    authApi.register.mockRejectedValue({
      response: { data: { message: "Account already exists with this email" } },
    });

    render(
      <MemoryRouter>
        <RegisterSellerPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/Ho ten/i), "Seller Two");
    await user.type(screen.getByLabelText(/^Email/i), "seller2@example.com");
    await user.type(screen.getByLabelText(/So dien thoai/i), "0909999999");
    await user.type(screen.getByLabelText(/Ten business/i), "Seller Business");
    await user.type(screen.getByLabelText(/Ten shop/i), "Seller Shop");
    await user.type(screen.getByLabelText(/^Ngan hang/i), "VCB");
    await user.type(screen.getByLabelText(/Ten chu tai khoan/i), "Seller Two");
    await user.type(screen.getByLabelText(/So tai khoan/i), "123456789");
    await user.type(screen.getByLabelText(/^Mat khau/i), "12345678");
    await user.type(screen.getByLabelText(/Xac nhan mat khau/i), "12345678");

    await user.click(screen.getByRole("button", { name: /Gui dang ky seller/i }));

    expect(await screen.findByText(/Account already exists with this email/i)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Account already exists with this email");
  });
});

