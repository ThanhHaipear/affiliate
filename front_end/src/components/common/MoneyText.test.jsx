import { render, screen } from "@testing-library/react";
import MoneyText from "./MoneyText";

describe("MoneyText", () => {
  it("formats VND currency", () => {
    render(<MoneyText value={1500000} />);

    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/₫/)).toBeInTheDocument();
  });
});
