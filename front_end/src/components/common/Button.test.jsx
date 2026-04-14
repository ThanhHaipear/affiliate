import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "./Button";

describe("Button", () => {
  it("renders button text", () => {
    render(<Button>Submit</Button>);

    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("calls click handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Confirm</Button>);
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows loading state and disables button", () => {
    render(<Button loading>Save</Button>);

    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
  });
});
