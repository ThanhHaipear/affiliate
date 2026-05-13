const AppError = require("../../utils/app-error");
const appealRepository = require("./appeal.repository");

exports.createAppeal = async (accountId, payload) => {
  try {
    return await appealRepository.createAppeal({
      accountId,
      targetType: payload.targetType,
      targetId: Number(payload.targetId),
      content: payload.content,
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

exports.sendMessage = async (accountId, appealId, payload) => {
  try {
    return await appealRepository.sendMessage({
      appealId: Number(appealId),
      senderId: accountId,
      content: payload.content,
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

exports.adminReply = async (adminId, appealId, payload) => {
  try {
    return await appealRepository.adminReply({
      appealId: Number(appealId),
      adminId,
      content: payload.content,
      action: payload.action || "TEXT",
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

exports.getMyAppeals = async (accountId) =>
  appealRepository.listMyAppeals(accountId);

exports.getAllAppeals = async (query) =>
  appealRepository.listAllAppeals({ status: query?.status });

exports.getAppealById = async (appealId) => {
  const appeal = await appealRepository.getAppealById(Number(appealId));
  if (!appeal) {
    throw new AppError("Kiến nghị không tồn tại.", 404);
  }
  return appeal;
};
