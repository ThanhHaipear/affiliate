import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RegisterAffiliatePage from "./RegisterAffiliatePage";

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

describe("RegisterAffiliatePage", () => {
  it("validates required fields", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterAffiliatePage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /Gửi đăng ký affiliate/i }));

    expect(
      await screen.findByText(
        (content) => /doanh nghiệp|business/i.test(content) && /bắt buộc|bat buoc/i.test(content),
      ),
    ).toBeInTheDocument();
  });

  it("requires payment account and submits valid data", async () => {
    const user = userEvent.setup();
    const onRegisterSuccess = vi.fn();
    const authApi = await import("../../api/authApi");
    authApi.register.mockResolvedValue({});

    render(
      <MemoryRouter>
        <RegisterAffiliatePage onRegisterSuccess={onRegisterSuccess} />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/Họ tên/i), "Affiliate One");
    await user.type(screen.getByLabelText(/^Email/i), "affiliate@example.com");
    await user.type(screen.getByLabelText(/Số điện thoại/i), "0901234567");
    await user.type(screen.getByLabelText(/Tên doanh nghiệp/i), "Affiliate Business");
    await user.type(screen.getByLabelText(/Tên kênh/i), "Affiliate Channel");
    await user.type(screen.getByLabelText(/^Ngân hàng/i), "VCB");
    await user.type(screen.getByLabelText(/Tên chủ tài khoản/i), "Affiliate One");
    await user.type(screen.getByLabelText(/Số tài khoản/i), "123456789");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "12345678");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "12345678");

    await user.click(screen.getByRole("button", { name: /Gửi đăng ký affiliate/i }));

    await waitFor(() => expect(authApi.register).toHaveBeenCalledTimes(1));
    expect(authApi.register).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "AFFILIATE",
        fullName: "Affiliate One",
        businessName: "Affiliate Business",
        channelName: "Affiliate Channel",
        paymentMethod: "BANK_TRANSFER",
        bankName: "VCB",
        bankAccountName: "Affiliate One",
        bankAccountNumber: "123456789",
      }),
    );
    expect(onRegisterSuccess).toHaveBeenCalled();
    expect(screen.getByText(/chờ admin phê duyệt/i)).toBeInTheDocument();
  });

  it("shows backend error when registration fails", async () => {
    const user = userEvent.setup();
    const authApi = await import("../../api/authApi");
    authApi.register.mockRejectedValue({
      response: { data: { message: "Account already exists with this email" } },
    });

    render(
      <MemoryRouter>
        <RegisterAffiliatePage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/Họ tên/i), "Affiliate Two");
    await user.type(screen.getByLabelText(/^Email/i), "taken@example.com");
    await user.type(screen.getByLabelText(/Số điện thoại/i), "0909999999");
    await user.type(screen.getByLabelText(/Tên doanh nghiệp/i), "Affiliate Business");
    await user.type(screen.getByLabelText(/Tên kênh/i), "Affiliate Channel");
    await user.type(screen.getByLabelText(/^Ngân hàng/i), "VCB");
    await user.type(screen.getByLabelText(/Tên chủ tài khoản/i), "Affiliate Two");
    await user.type(screen.getByLabelText(/Số tài khoản/i), "123456789");
    await user.type(screen.getByLabelText(/^Mật khẩu/i), "12345678");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "12345678");

    await user.click(screen.getByRole("button", { name: /Gửi đăng ký affiliate/i }));

    expect(await screen.findByText(/Account already exists with this email/i)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Account already exists with this email");
  });
});
