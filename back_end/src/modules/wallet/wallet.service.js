const walletRepository = require("./wallet.repository");

exports.getMyWallets = (accountId, roles) => walletRepository.getWalletsForUser(accountId, roles);
