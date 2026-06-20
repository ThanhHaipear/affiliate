import { fireEvent, render, screen } from "@testing-library/react";
import Input from "./Input";

describe("Input", () => {
  it("removes focus from number input when the mouse wheel is used", () => {
    render(<Input label="Tồn kho" type="number" value="5" onChange={() => {}} />);
    const input = screen.getByLabelText("Tồn kho");

    input.focus();
    fireEvent.wheel(input, { deltaY: 100 });

    expect(input).not.toHaveFocus();
  });
});
