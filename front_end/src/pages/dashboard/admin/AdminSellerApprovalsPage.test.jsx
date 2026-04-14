import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminSellerApprovalsPage from "./AdminSellerApprovalsPage";

const items = [{ id: "seller-1", businessName: "Seller One", ownerName: "seller@example.com", status: "PENDING" }];

describe("AdminSellerApprovalsPage", () => {
  it("renders pending item", () => {
    render(<AdminSellerApprovalsPage items={items} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText("Seller One")).toBeInTheDocument();
  });

  it("approve calls callback", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<AdminSellerApprovalsPage items={items} onApprove={onApprove} onReject={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(screen.getAllByRole("button").at(-1));

    expect(onApprove).toHaveBeenCalledWith(items[0]);
  });

  it("reject requires reason and calls callback", async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(<AdminSellerApprovalsPage items={items} onApprove={vi.fn()} onReject={onReject} />);

    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.click(screen.getAllByRole("button").at(-1));
    expect(screen.getByText("Reject reason is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Reject reason"), "Missing docs");
    await user.click(screen.getAllByRole("button").at(-1));

    expect(onReject).toHaveBeenCalledWith(items[0], "Missing docs");
  });
});
