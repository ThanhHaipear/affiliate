import { screen, within } from "@testing-library/react";
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
    },
  ];

  it("always shows pending commission", () => {
    renderWithProviders(<AffiliateCommissionsPage commissions={commissions} />);

    const creditedRow = screen.getByText("OD-1").closest("tr");
    const pendingRow = screen.getByText("OD-2").closest("tr");

    expect(within(creditedRow).getAllByText(/100\.000/)).toHaveLength(3);
    expect(within(pendingRow).getAllByText(/200\.000/)).toHaveLength(2);
  });

  it("shows actual commission only when seller confirmed money", () => {
    renderWithProviders(<AffiliateCommissionsPage commissions={commissions} />);

    const creditedRow = screen.getByText("OD-1").closest("tr");
    const pendingRow = screen.getByText("OD-2").closest("tr");

    expect(within(creditedRow).getAllByText(/100\.000/)).toHaveLength(3);
    expect(within(pendingRow).getByText(/Chua du dieu kien/i)).toBeInTheDocument();
  });

  it("does not show platform fee metric and column", () => {
    renderWithProviders(<AffiliateCommissionsPage commissions={commissions} />);

    expect(screen.queryByText(/Phi nen tang/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Hoa hồng affiliate/i)).toBeInTheDocument();
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
});
