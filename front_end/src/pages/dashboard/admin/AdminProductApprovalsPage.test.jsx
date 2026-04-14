import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminProductApprovalsPage from "./AdminProductApprovalsPage";

const items = [{ id: "product-1", name: "Product One", sellerName: "Seller", productStatus: "PENDING", affiliateStatus: "PENDING" }];

describe("AdminProductApprovalsPage", () => {
  it("renders pending item", () => {
    render(<AdminProductApprovalsPage items={items} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText("Product One")).toBeInTheDocument();
  });

  it("approve calls callback", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<AdminProductApprovalsPage items={items} onApprove={onApprove} onReject={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(screen.getAllByRole("button").at(-1));

    expect(onApprove).toHaveBeenCalledWith(items[0]);
  });

  it("reject requires reason and calls callback", async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(<AdminProductApprovalsPage items={items} onApprove={vi.fn()} onReject={onReject} />);

    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.click(screen.getAllByRole("button").at(-1));
    expect(screen.getByText("Reject reason is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Reject reason"), "Quality issue");
    await user.click(screen.getAllByRole("button").at(-1));

    expect(onReject).toHaveBeenCalledWith(items[0], "Quality issue");
  });
});
