import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmModal from "./ConfirmModal";

describe("ConfirmModal", () => {
  it("does not render when closed", () => {
    render(<ConfirmModal open={false} onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.queryByText(/thao tac/i)).not.toBeInTheDocument();
  });

  it("calls confirm and close callbacks", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(<ConfirmModal open title="Delete record" onClose={onClose} onConfirm={onConfirm} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons.at(-1));
    await user.click(buttons.at(-2));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
