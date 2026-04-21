import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AffiliateCommissionsPage from "./AffiliateCommissionsPage";
import { renderWithProviders } from "../../../test/test-utils";

describe("AffiliateCommissionsPage", () => {
  const commissions = [
    {
      id: "1",
      order_code: "OD-1",
      product_name: "Product A",
      order_amount: 1000000,
      platform_fee_amount: 50000,
      affiliate_commission_amount: 100000,
      pending_amount: 100000,
      actual_amount: 100000,
      status: "WALLET_CREDITED",
      seller_confirmed_received_money: true,
      order_status: "COMPLETED",
      reason: "Credited",
      raw: { createdAt: "2026-01-01T00:00:00.000Z" },
    },
    {
      id: "2",
      order_code: "OD-2",
      product_name: "Product B",
      order_amount: 2000000,
      platform_fee_amount: 100000,
      affiliate_commission_amount: 200000,
      pending_amount: 200000,
      actual_amount: 0,
      status: "PENDING",
      seller_confirmed_received_money: false,
      order_status: "PROCESSING",
      reason: "Pending",
      raw: { createdAt: "2026-01-03T00:00:00.000Z" },
    },
    {
      id: "3",
      order_code: "OD-3",
      product_name: "Product C",
      order_amount: 3000000,
      platform_fee_amount: 150000,
      affiliate_commission_amount: 300000,
      pending_amount: 300000,
      actual_amount: 0,
      status: "REJECTED",
      seller_confirmed_received_money: false,
      order_status: "CANCELLED",
      reason: "Cancelled",
      raw: { createdAt: "2026-01-04T00:00:00.000Z" },
    },
    {
      id: "4",
      order_code: "OD-4",
      product_name: "Product D",
      order_amount: 4000000,
      platform_fee_amount: 200000,
      affiliate_commission_amount: 400000,
      pending_amount: 400000,
      actual_amount: 0,
      status: "REJECTED",
      seller_confirmed_received_money: false,
      order_status: "REFUNDED",
      reason: "Refunded",
      raw: { createdAt: "2026-01-02T00:00:00.000Z" },
    },
  ];

  it("always shows pending commission", () => {
    renderWithProviders(<AffiliateCommissionsPage commissions={commissions} />);

    const creditedRow = screen.getByText("OD-1").closest("tr");
    const pendingRow = screen.getByText("OD-2").closest("tr");

    expect(within(creditedRow).getAllByText(/100\.000/)).toHaveLength(2);
    expect(within(pendingRow).getAllByText(/200\.000/)).toHaveLength(1);
  });

  it("shows actual commission only when seller confirmed money", () => {
    renderWithProviders(<AffiliateCommissionsPage commissions={commissions} />);

    const creditedRow = screen.getByText("OD-1").closest("tr");
    const pendingRow = screen.getByText("OD-2").closest("tr");

    expect(within(creditedRow).getAllByText(/100\.000/)).toHaveLength(2);
    expect(within(pendingRow).getByText(/Chưa đủ điều kiện/i)).toBeInTheDocument();
  });

  it("does not show platform fee metric and column", () => {
    renderWithProviders(<AffiliateCommissionsPage commissions={commissions} />);

    expect(screen.queryByText(/Phí nền tảng/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hoa hồng affiliate/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tổng tiền/i)).not.toBeInTheDocument();
  });

  it("shows not eligible message for cancelled order", () => {
    renderWithProviders(<AffiliateCommissionsPage commissions={commissions} />);

    expect(
      screen.getByText(/Không đủ điều kiện nhận hoa hồng vì đơn hàng đã bị hủy/i),
    ).toBeInTheDocument();
  });

  it("shows not eligible message for refunded order", () => {
    renderWithProviders(<AffiliateCommissionsPage commissions={commissions} />);

    expect(
      screen.getByText(/Không đủ điều kiện nhận hoa hồng vì đơn hàng đã được hoàn tiền/i),
    ).toBeInTheDocument();
  });

  it("sorts pending status to the top before other rows", () => {
    renderWithProviders(<AffiliateCommissionsPage commissions={commissions} />);

    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(within(bodyRows[0]).getByText("OD-2")).toBeInTheDocument();
  });

  it("paginates commissions with 8 batches per page", async () => {
    const user = userEvent.setup();
    const paginatedCommissions = Array.from({ length: 9 }, (_, index) => ({
      id: String(index + 1),
      order_code: `OD-${index + 1}`,
      product_name: `Product ${index + 1}`,
      order_amount: 100000 * (index + 1),
      platform_fee_amount: 10000,
      affiliate_commission_amount: 20000,
      pending_amount: index === 8 ? 10000 : 0,
      actual_amount: index === 8 ? 0 : 20000,
      status: index === 8 ? "PENDING" : "WALLET_CREDITED",
      seller_confirmed_received_money: index !== 8,
      order_status: "COMPLETED",
      reason: "",
      raw: { createdAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z` },
    }));

    renderWithProviders(<AffiliateCommissionsPage commissions={paginatedCommissions} />);

    expect(screen.getByText("Trang 1 / 2")).toBeInTheDocument();
    expect(screen.getByText("OD-9")).toBeInTheDocument();
    expect(screen.getByText("OD-8")).toBeInTheDocument();
    expect(screen.queryByText("OD-1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sau" }));

    expect(screen.getByText("Trang 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("OD-1")).toBeInTheDocument();
    expect(screen.queryByText("OD-8")).not.toBeInTheDocument();
  });
});
