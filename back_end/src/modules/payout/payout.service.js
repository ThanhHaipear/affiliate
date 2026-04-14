const payoutRepository = require("./payout.repository");

exports.listBatches = () => payoutRepository.listBatches();
exports.createBatch = (adminId, payload) => payoutRepository.createBatch(adminId, payload);
exports.processBatch = (batchId, adminId, payload) => payoutRepository.processBatch(batchId, adminId, payload.transactionCodePrefix);
