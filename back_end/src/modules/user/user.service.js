const AppError = require("../../utils/app-error");
const userRepository = require("./user.repository");

const getCustomerProfileOrThrow = async (accountId) => {
  const profile = await userRepository.findCustomerProfile(accountId);
  if (!profile) {
    throw new AppError("Customer profile not found", 404);
  }
  return profile;
};

exports.getProfile = (accountId) => getCustomerProfileOrThrow(accountId);

exports.updateProfile = async (accountId, payload) => {
  await getCustomerProfileOrThrow(accountId);
  return userRepository.updateCustomerProfile(accountId, payload);
};
