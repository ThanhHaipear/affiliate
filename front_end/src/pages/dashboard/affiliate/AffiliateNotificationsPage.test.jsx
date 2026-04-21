import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import AffiliateNotificationsPage from "./AffiliateNotificationsPage";
import { renderWithProviders } from "../../../test/test-utils";

const mockGetNotifications = vi.fn();
const mockMarkNotificationAsRead = vi.fn();

vi.mock("../../../api/notificationApi", () => ({
  getNotifications: (...args) => mockGetNotifications(...args),
  markNotificationAsRead: (...args) => mockMarkNotificationAsRead(...args),
}));

describe("AffiliateNotificationsPage", () => {
  beforeEach(() => {
    mockGetNotifications.mockResolvedValue([]);
    mockMarkNotificationAsRead.mockResolvedValue({});
  });

  it("prioritizes unread notifications and paginates 8 items per page", async () => {
    const notifications = Array.from({ length: 9 }, (_, index) => ({
      id: String(index + 1),
      title: `Thông báo ${index + 1}`,
      content: `Nội dung ${index + 1}`,
      type: index === 0 ? "commission" : "GENERAL",
      isRead: index < 8,
      createdAt: `2026-04-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    }));

    mockGetNotifications.mockResolvedValue(notifications);

    const user = userEvent.setup();
    renderWithProviders(<AffiliateNotificationsPage />);

    expect(await screen.findByText("Thông báo")).toBeInTheDocument();
    expect(screen.getByText("Trang 1 / 2")).toBeInTheDocument();

    const unreadBadge = screen.getAllByText("Chưa đọc")[0];
    const firstCard = unreadBadge.closest(".rounded-\\[2rem\\]");
    expect(within(firstCard).getByText("Thông báo 9")).toBeInTheDocument();

    expect(screen.getByText("Thông báo 2")).toBeInTheDocument();
    expect(screen.getByText("Thông báo 8")).toBeInTheDocument();
    expect(screen.queryByText("Thông báo 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sau" }));

    expect(screen.getByText("Trang 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("Thông báo 1")).toBeInTheDocument();
    expect(screen.queryByText("Thông báo 2")).not.toBeInTheDocument();
  });

  it("marks all unread notifications as read", async () => {
    const notifications = [
      {
        id: "n-1",
        title: "Thông báo chưa đọc 1",
        content: "Nội dung 1",
        type: "commission",
        isRead: false,
        createdAt: "2026-04-21T10:00:00.000Z",
      },
      {
        id: "n-2",
        title: "Thông báo đã đọc",
        content: "Nội dung 2",
        type: "GENERAL",
        isRead: true,
        createdAt: "2026-04-20T10:00:00.000Z",
      },
      {
        id: "n-3",
        title: "Thông báo chưa đọc 2",
        content: "Nội dung 3",
        type: "payout",
        isRead: false,
        createdAt: "2026-04-19T10:00:00.000Z",
      },
    ];

    mockGetNotifications.mockResolvedValue(notifications);

    const user = userEvent.setup();
    renderWithProviders(<AffiliateNotificationsPage />);

    expect(await screen.findByText("Thông báo chưa đọc 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Đánh dấu đã đọc tất cả" }));

    expect(mockMarkNotificationAsRead).toHaveBeenCalledTimes(2);
    expect(mockMarkNotificationAsRead).toHaveBeenCalledWith("n-1");
    expect(mockMarkNotificationAsRead).toHaveBeenCalledWith("n-3");
    expect(screen.queryByText("Chưa đọc")).not.toBeInTheDocument();
    expect(screen.getAllByText("Đã đọc")).toHaveLength(3);
  });
});
