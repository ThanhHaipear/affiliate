const { customAlphabet } = require("nanoid");

const uppercaseId = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);

exports.generateShortCode = () => uppercaseId(8);
exports.generateOrderCode = () => `ORD-${Date.now()}-${uppercaseId(6)}`;
exports.generateTxnCode = () => `TXN-${Date.now()}-${uppercaseId(8)}`;
exports.generateAttributionToken = () => uppercaseId(24);
