import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CopyBox from "./CopyBox";

describe("CopyBox", () => {
  it("renders link value", () => {
    render(<CopyBox value="https://example.com/ref-1" />);

    expect(screen.getByDisplayValue("https://example.com/ref-1")).toBeInTheDocument();
  });

  it("copies text and updates button label", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = writeText;
    render(<CopyBox value="https://example.com/ref-1" />);

    await user.click(screen.getByRole("button", { name: /Sao chép link/i }));

    expect(writeText).toHaveBeenCalledWith("https://example.com/ref-1");
    expect(screen.getByRole("button", { name: /Đã sao chép/i })).toBeInTheDocument();
  });
});
