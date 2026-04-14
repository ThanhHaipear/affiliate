import { screen } from "@testing-library/react";
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
});
