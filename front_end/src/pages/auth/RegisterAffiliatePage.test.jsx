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

    await user.click(screen.getByRole("button", { name: /Gui dang ky affiliate/i }));

    expect(
      await screen.findByText(
        (content) => /business/i.test(content) && /bat buoc|bắt buộc/i.test(content),
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

    await user.type(screen.getByLabelText(/Ho ten/i), "Affiliate One");
    await user.type(screen.getByLabelText(/^Email/i), "affiliate@example.com");
    await user.type(screen.getByLabelText(/So dien thoai/i), "0901234567");
    await user.type(screen.getByLabelText(/Ten business/i), "Affiliate Business");
    await user.type(screen.getByLabelText(/Ten kenh/i), "Affiliate Channel");
    await user.type(screen.getByLabelText(/^Ngan hang/i), "VCB");
    await user.type(screen.getByLabelText(/Ten chu tai khoan/i), "Affiliate One");
    await user.type(screen.getByLabelText(/So tai khoan/i), "123456789");
    await user.type(screen.getByLabelText(/^Mat khau/i), "12345678");
    await user.type(screen.getByLabelText(/Xac nhan mat khau/i), "12345678");

    await user.click(screen.getByRole("button", { name: /Gui dang ky affiliate/i }));

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
    expect(screen.getByText(/cho admin phe duyet/i)).toBeInTheDocument();
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

    await user.type(screen.getByLabelText(/Ho ten/i), "Affiliate Two");
    await user.type(screen.getByLabelText(/^Email/i), "taken@example.com");
    await user.type(screen.getByLabelText(/So dien thoai/i), "0909999999");
    await user.type(screen.getByLabelText(/Ten business/i), "Affiliate Business");
    await user.type(screen.getByLabelText(/Ten kenh/i), "Affiliate Channel");
    await user.type(screen.getByLabelText(/^Ngan hang/i), "VCB");
    await user.type(screen.getByLabelText(/Ten chu tai khoan/i), "Affiliate Two");
    await user.type(screen.getByLabelText(/So tai khoan/i), "123456789");
    await user.type(screen.getByLabelText(/^Mat khau/i), "12345678");
    await user.type(screen.getByLabelText(/Xac nhan mat khau/i), "12345678");

    await user.click(screen.getByRole("button", { name: /Gui dang ky affiliate/i }));

    expect(await screen.findByText(/Account already exists with this email/i)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Account already exists with this email");
  });
});
