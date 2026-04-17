const prisma = require("../../config/prisma");
const { generateTxnCode } = require("../../utils/code");

exports.findBatchById = (batchId) => prisma.payoutBatch.findUnique({
  where: { id: BigInt(batchId) },
  include: { items: true, withdrawals: true },
});

exports.createBatch = (adminId, payload) => prisma.$transaction(async (tx) => {
  const withdrawals = await tx.withdrawal.findMany({
    where: { id: { in: payload.withdrawalIds.map((id) => BigInt(id)) }, status: "APPROVED" },
    include: {
      affiliatePaymentAccount: true,
      sellerPaymentAccount: true,
      wallet: { include: { affiliate: true, seller: true } }
    }
  });

  const totalAmount = withdrawals.reduce((sum, item) => sum + Number(item.amount), 0);
  const batch = await tx.payoutBatch.create({
    data: {
      payoutDate: new Date(payload.payoutDate),
      type: payload.type,
      bankName: payload.bankName,
      branch: payload.branch,
      totalRequests: withdrawals.length,
      totalAmount: BigInt(totalAmount),
      createdAt: new Date(),
      createdBy: adminId,
      note: payload.note
    }
  });

  for (const withdrawal of withdrawals) {
    await tx.withdrawal.update({ where: { id: withdrawal.id }, data: { payoutBatchId: batch.id, status: "PROCESSING" } });
    await tx.payoutBatchItem.create({
      data: {
        payoutBatchId: batch.id,
        withdrawalId: withdrawal.id,
        type: payload.type,
        bankName: withdrawal.affiliatePaymentAccount?.bankName || withdrawal.sellerPaymentAccount?.bankName,
        accountNumber: withdrawal.affiliatePaymentAccount?.accountNumber || withdrawal.sellerPaymentAccount?.accountNumber,
        accountName: withdrawal.affiliatePaymentAccount?.accountName || withdrawal.sellerPaymentAccount?.accountName,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  await tx.activityLog.create({
    data: {
      accountId: adminId,
      action: "PAYOUT_BATCH_CREATED",
      targetType: "PAYOUT_BATCH",
      targetId: batch.id,
      description: `Payout batch ${batch.id} created with ${withdrawals.length} withdrawals`,
      createdAt: new Date()
    }
  });

  for (const withdrawal of withdrawals) {
    const recipientAccountId = withdrawal.wallet.affiliateId || withdrawal.wallet.seller?.ownerAccountId;
    if (!recipientAccountId) continue;

    await tx.notification.create({
      data: {
        accountId: recipientAccountId,
        title: "Withdrawal is being processed",
        content: `Your withdrawal ${withdrawal.id} has been added to payout batch ${batch.id}.`,
        type: "PAYOUT_BATCH_CREATED",
        targetType: "PAYOUT_BATCH",
        targetId: batch.id,
        createdAt: new Date()
      }
    });
  }

  return tx.payoutBatch.findUnique({ where: { id: batch.id }, include: { items: true, withdrawals: true } });
});

exports.processBatch = (batchId, adminId, transactionCodePrefix) => prisma.$transaction(async (tx) => {
  const batch = await tx.payoutBatch.findUnique({
    where: { id: BigInt(batchId) },
    include: {
      items: true,
      withdrawals: {
        include: {
          wallet: { include: { affiliate: true, seller: true } }
        }
      }
    }
  });

  if (!batch) {
    throw new Error("Payout batch not found");
  }

  if (batch.status === "COMPLETED") {
    return tx.payoutBatch.findUnique({ where: { id: BigInt(batchId) }, include: { items: true, withdrawals: true } });
  }

  for (const item of batch.items) {
    await tx.payoutBatchItem.update({
      where: { id: item.id },
      data: {
        status: "PAID",
        transactionCode: transactionCodePrefix ? `${transactionCodePrefix}-${item.id}` : generateTxnCode(),
        updatedAt: new Date()
      }
    });

    await tx.withdrawal.update({
      where: { id: item.withdrawalId },
      data: { status: "PAID", processedAt: new Date(), processedBy: adminId }
    });
  }

  const updatedBatch = await tx.payoutBatch.update({
    where: { id: BigInt(batchId) },
    data: { status: "COMPLETED", processedAt: new Date(), completedAt: new Date(), processedBy: adminId },
    include: { items: true, withdrawals: true }
  });

  await tx.activityLog.create({
    data: {
      accountId: adminId,
      action: "PAYOUT_BATCH_COMPLETED",
      targetType: "PAYOUT_BATCH",
      targetId: BigInt(batchId),
      description: `Payout batch ${batchId} processed successfully`,
      createdAt: new Date()
    }
  });

  for (const withdrawal of batch.withdrawals) {
    const recipientAccountId = withdrawal.wallet.affiliateId || withdrawal.wallet.seller?.ownerAccountId;
    if (!recipientAccountId) continue;

    await tx.notification.create({
      data: {
        accountId: recipientAccountId,
        title: "Withdrawal paid",
        content: `Your withdrawal ${withdrawal.id} has been paid in batch ${batchId}.`,
        type: "WITHDRAWAL_PAID",
        targetType: "WITHDRAWAL",
        targetId: withdrawal.id,
        createdAt: new Date()
      }
    });
  }

  return updatedBatch;
});

exports.listBatches = () => prisma.payoutBatch.findMany({ include: { items: true, withdrawals: true }, orderBy: { createdAt: "desc" } });
