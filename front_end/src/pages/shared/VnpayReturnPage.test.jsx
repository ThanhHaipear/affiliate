import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";

const confirmVnpayReturn = vi.fn();
const confirmPayoutBatchVnpayReturn = vi.fn();
const successToast = vi.fn();
const errorToast = vi.fn();

vi.mock("../../api/orderApi", () => ({
  confirmVnpayReturn,
}));

vi.mock("../../api/adminApi", () => ({
  confirmPayoutBatchVnpayReturn,
}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({
    success: successToast,
    error: errorToast,
  }),
}));

describe("VnpayReturnPage", () => {
  beforeEach(() => {
    confirmVnpayReturn.mockReset();
    confirmPayoutBatchVnpayReturn.mockReset();
    successToast.mockReset();
    errorToast.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("confirms an order payment only once in StrictMode for the same VNPay return params", async () => {
    confirmVnpayReturn.mockResolvedValue({
      success: true,
      orderId: "101",
      orderCode: "ORD-101",
      totalOrders: 1,
      responseCode: "00",
      transactionNo: "TXN-1",
      bankCode: "NCB",
    });

    const { default: VnpayReturnPage } = await import("./VnpayReturnPage");

    renderWithProviders(
      <React.StrictMode>
        <VnpayReturnPage />
      </React.StrictMode>,
      {
        route:
          "/payment/vnpay-return?vnp_TxnRef=101-1710000000000&vnp_SecureHash=secure-hash&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_TransactionNo=TXN-1&vnp_BankCode=NCB",
      },
    );

    await screen.findByText("Giao dịch thành công");

    await waitFor(() => {
      expect(confirmVnpayReturn).toHaveBeenCalledTimes(1);
    });

    expect(successToast).toHaveBeenCalledTimes(1);
    expect(errorToast).not.toHaveBeenCalled();
    expect(confirmPayoutBatchVnpayReturn).not.toHaveBeenCalled();
  });

  it("reuses the stored VNPay verification result from sessionStorage without calling confirm again", async () => {
    window.localStorage.setItem(
      "affiliate-platform:vnpay-return:order:?vnp_TxnRef=101-1710000000000&vnp_SecureHash=secure-hash&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_TransactionNo=TXN-1&vnp_BankCode=NCB",
      JSON.stringify({
        status: "fulfilled",
        value: {
          success: true,
          orderId: "101",
          orderCode: "ORD-101",
          totalOrders: 1,
          responseCode: "00",
          transactionNo: "TXN-1",
          bankCode: "NCB",
        },
        successToastShown: true,
        failureToastShown: false,
        storedAt: Date.now(),
      }),
    );

    const { default: VnpayReturnPage } = await import("./VnpayReturnPage");

    renderWithProviders(<VnpayReturnPage />, {
      route:
        "/payment/vnpay-return?vnp_TxnRef=101-1710000000000&vnp_SecureHash=secure-hash&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_TransactionNo=TXN-1&vnp_BankCode=NCB",
    });

    await screen.findByText("Giao dịch thành công");

    expect(confirmVnpayReturn).not.toHaveBeenCalled();
    expect(confirmPayoutBatchVnpayReturn).not.toHaveBeenCalled();
    expect(successToast).not.toHaveBeenCalled();
    expect(errorToast).not.toHaveBeenCalled();
  });

  it("waits for a shared pending verification to finish instead of sending another confirm request", async () => {
    const storageKey =
      "affiliate-platform:vnpay-return:order:?vnp_TxnRef=101-1710000000000&vnp_SecureHash=secure-hash&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_TransactionNo=TXN-1&vnp_BankCode=NCB";

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        status: "pending",
        successToastShown: false,
        failureToastShown: false,
        storedAt: Date.now(),
      }),
    );

    window.setTimeout(() => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          status: "fulfilled",
          value: {
            success: true,
            orderId: "101",
            orderCode: "ORD-101",
            totalOrders: 1,
            responseCode: "00",
            transactionNo: "TXN-1",
            bankCode: "NCB",
          },
          successToastShown: true,
          failureToastShown: false,
          storedAt: Date.now(),
        }),
      );
    }, 50);

    const { default: VnpayReturnPage } = await import("./VnpayReturnPage");

    renderWithProviders(<VnpayReturnPage />, {
      route:
        "/payment/vnpay-return?vnp_TxnRef=101-1710000000000&vnp_SecureHash=secure-hash&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_TransactionNo=TXN-1&vnp_BankCode=NCB",
    });

    await screen.findByText("Giao dịch thành công");

    expect(confirmVnpayReturn).not.toHaveBeenCalled();
    expect(confirmPayoutBatchVnpayReturn).not.toHaveBeenCalled();
  });
});
