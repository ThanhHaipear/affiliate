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

    await user.click(screen.getByRole("button", { name: /Gửi đăng ký seller/i }));

    expect(
      await screen.findByText(
        (content) => /doanh nghiệp|business/i.test(content) && /bắt buộc|bat buoc/i.test(content),
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

    await user.type(screen.getByLabelText(/Họ tên/i), "Seller One");
    await user.type(screen.getByLabelText(/^Email/i), "seller@example.com");
    await user.type(screen.getByLabelText(/Số điện thoại/i), "0901234567");
    await user.type(screen.getByLabelText(/Tên doanh nghiệp/i), "Seller Business");
    await user.type(screen.getByLabelText(/Tên shop/i), "Seller Shop");
    await user.type(screen.getByLabelText(/^Ngân hàng/i), "VCB");
    await user.type(screen.getByLabelText(/Tên chủ tài khoản/i), "Seller One");
    await user.type(screen.getByLabelText(/Số tài khoản/i), "123456789");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "12345678");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "12345678");

    await user.click(screen.getByRole("button", { name: /Gửi đăng ký seller/i }));

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
    expect(screen.getByText(/Hệ thống đã lưu sẵn thông tin shop và tài khoản thanh toán/i)).toBeInTheDocument();
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

    await user.type(screen.getByLabelText(/Họ tên/i), "Seller Two");
    await user.type(screen.getByLabelText(/^Email/i), "seller2@example.com");
    await user.type(screen.getByLabelText(/Số điện thoại/i), "0909999999");
    await user.type(screen.getByLabelText(/Tên doanh nghiệp/i), "Seller Business");
    await user.type(screen.getByLabelText(/Tên shop/i), "Seller Shop");
    await user.type(screen.getByLabelText(/^Ngân hàng/i), "VCB");
    await user.type(screen.getByLabelText(/Tên chủ tài khoản/i), "Seller Two");
    await user.type(screen.getByLabelText(/Số tài khoản/i), "123456789");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "12345678");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "12345678");

    await user.click(screen.getByRole("button", { name: /Gửi đăng ký seller/i }));

    expect(await screen.findByText(/Account already exists with this email/i)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Account already exists with this email");
  });
});
