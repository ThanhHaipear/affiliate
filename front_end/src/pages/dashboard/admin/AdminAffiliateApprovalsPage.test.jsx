import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminAffiliateApprovalsPage from "./AdminAffiliateApprovalsPage";

const items = [{ id: "aff-1", channelName: "Affiliate One", ownerName: "affiliate@example.com", status: "PENDING" }];

describe("AdminAffiliateApprovalsPage", () => {
  it("renders pending item", () => {
    render(<AdminAffiliateApprovalsPage items={items} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText("Affiliate One")).toBeInTheDocument();
  });

  it("approve calls callback", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<AdminAffiliateApprovalsPage items={items} onApprove={onApprove} onReject={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(screen.getAllByRole("button").at(-1));

    expect(onApprove).toHaveBeenCalledWith(items[0]);
  });

  it("reject requires reason and calls callback", async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(<AdminAffiliateApprovalsPage items={items} onApprove={vi.fn()} onReject={onReject} />);

    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.click(screen.getAllByRole("button").at(-1));
    expect(screen.getByText("Reject reason is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Reject reason"), "Missing docs");
    await user.click(screen.getAllByRole("button").at(-1));

    expect(onReject).toHaveBeenCalledWith(items[0], "Missing docs");
  });
});
