const commissionRepository = require("./commission.repository");

exports.listMyCommissions = (accountId, roles) => commissionRepository.listMyCommissions(accountId, roles);
