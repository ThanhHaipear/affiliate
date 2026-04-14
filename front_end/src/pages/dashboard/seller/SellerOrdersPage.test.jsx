import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SellerOrdersPage from "./SellerOrdersPage";
import { renderWithProviders } from "../../../test/test-utils";

describe("SellerOrdersPage", () => {
  const orders = [
    {
      id: "ord-1",
      code: "ORD-1",
      product_name: "Product A",
      amount: 100000,
      order_status: "PENDING_PAYMENT",
      payment_status: "PENDING",
      created_at: "2026-01-01T00:00:00.000Z",
      seller_confirmed_received_money: false,
    },
    {
      id: "ord-3",
      code: "ORD-3",
      product_name: "Product C",
      amount: 150000,
      order_status: "REFUNDED",
      payment_status: "REFUNDED",
      created_at: "2026-01-01T00:00:00.000Z",
      seller_confirmed_received_money: false,
    },
    {
      id: "ord-2",
      code: "ORD-2",
      product_name: "Product B",
      amount: 200000,
      order_status: "COMPLETED",
      payment_status: "PAID",
      created_at: "2026-01-01T00:00:00.000Z",
      seller_confirmed_received_money: true,
    },
  ];

  it("renders order list", () => {
    renderWithProviders(<SellerOrdersPage orders={orders} />);

    expect(screen.getByText("ORD-1")).toBeInTheDocument();
    expect(screen.getByText("ORD-2")).toBeInTheDocument();
  });

  it("opens confirm modal and calls handler", async () => {
    const user = userEvent.setup();
    const onConfirmReceivedMoney = vi.fn();

    renderWithProviders(
      <SellerOrdersPage
        orders={orders}
        onConfirmReceivedMoney={onConfirmReceivedMoney}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Xác nhận đã nhận tiền" }));
    expect(
      screen.getByRole("heading", { name: "Xác nhận đã nhận tiền" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(onConfirmReceivedMoney).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ord-1" }),
    );
  });

  it("shows confirm and refund actions for pending payment order", () => {
    renderWithProviders(<SellerOrdersPage orders={orders} />);

    expect(screen.getAllByRole("button", { name: "Xác nhận đã nhận tiền" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Hoàn tiền" })).toHaveLength(1);
    expect(screen.getAllByText("Đã hoàn tiền").length).toBeGreaterThan(0);
  });
});
