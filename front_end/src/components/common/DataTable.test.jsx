import { render, screen } from "@testing-library/react";
import DataTable from "./DataTable";

describe("DataTable", () => {
  const columns = [
    { key: "name", title: "Name" },
    { key: "status", title: "Status" },
  ];

  it("renders table rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={[
          { id: "1", name: "Product A", status: "APPROVED" },
          { id: "2", name: "Product B", status: "PENDING" },
        ]}
      />,
    );

    expect(screen.getByText("Product A")).toBeInTheDocument();
    expect(screen.getByText("Product B")).toBeInTheDocument();
  });

  it("renders empty state when rows are empty", () => {
    render(<DataTable columns={columns} rows={[]} />);

    expect(screen.getByText("Khong co ban ghi")).toBeInTheDocument();
  });
});
