import { render, screen } from "@testing-library/react";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  it("maps approved status label", () => {
    render(<StatusBadge status="APPROVED" />);

    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("maps wallet credited status label", () => {
    render(<StatusBadge status="WALLET_CREDITED" />);

    expect(screen.getByText("Wallet Credited")).toBeInTheDocument();
  });
});
