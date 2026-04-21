import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AffiliateMarketplacePage from "./AffiliateMarketplacePage";
import { renderWithProviders } from "../../../test/test-utils";

describe("AffiliateMarketplacePage", () => {
  it("renders only affiliate enabled and approved products", () => {
    renderWithProviders(
      <AffiliateMarketplacePage
        products={[
          {
            id: "1",
            name: "Approved Product",
            image: "/a.jpg",
            category: "Cat",
            description: "Description long enough",
            price: 100000,
            seller_name: "Seller",
            approval_status: "APPROVED",
            affiliate_enabled: true,
            affiliate_setting_status: "APPROVED",
            commission_type: "PERCENT",
            commission_value: 10,
          },
          {
            id: "2",
            name: "Pending Product",
            image: "/b.jpg",
            category: "Cat",
            description: "Description long enough",
            price: 200000,
            seller_name: "Seller",
            approval_status: "PENDING",
            affiliate_enabled: true,
            affiliate_setting_status: "APPROVED",
            commission_type: "PERCENT",
            commission_value: 10,
          },
          {
            id: "3",
            name: "Disabled Product",
            image: "/c.jpg",
            category: "Cat",
            description: "Description long enough",
            price: 300000,
            seller_name: "Seller",
            approval_status: "APPROVED",
            affiliate_enabled: false,
            affiliate_setting_status: "APPROVED",
            commission_type: "PERCENT",
            commission_value: 10,
          },
        ]}
      />,
    );

    expect(screen.getByText("Approved Product")).toBeInTheDocument();
    expect(screen.queryByText("Pending Product")).not.toBeInTheDocument();
    expect(screen.queryByText("Disabled Product")).not.toBeInTheDocument();
  });

  it("paginates affiliate products with 9 items per page", async () => {
    const user = userEvent.setup();
    const products = Array.from({ length: 10 }, (_, index) => ({
      id: String(index + 1),
      name: `Approved Product ${index + 1}`,
      image: `/product-${index + 1}.jpg`,
      category: "Cat",
      description: "Description long enough",
      price: 100000 + index,
      seller_name: "Seller",
      approval_status: "APPROVED",
      affiliate_enabled: true,
      affiliate_setting_status: "APPROVED",
      commission_type: "PERCENT",
      commission_value: 10,
    }));

    renderWithProviders(<AffiliateMarketplacePage products={products} />);

    expect(screen.getByText("Approved Product 1")).toBeInTheDocument();
    expect(screen.getByText("Approved Product 9")).toBeInTheDocument();
    expect(screen.queryByText("Approved Product 10")).not.toBeInTheDocument();
    expect(screen.getByText("Trang 1 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sau" }));

    expect(screen.getByText("Approved Product 10")).toBeInTheDocument();
    expect(screen.queryByText("Approved Product 1")).not.toBeInTheDocument();
    expect(screen.getByText("Trang 2 / 2")).toBeInTheDocument();
  });
});
