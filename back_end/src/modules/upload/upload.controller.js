const asyncHandler = require("../../utils/async-handler");
const AppError = require("../../utils/app-error");
const { successResponse } = require("../../utils/api-response");
const uploadService = require("./upload.service");

exports.uploadImage = asyncHandler(async (req, res) => {
  const files = [
    ...(req.files?.files || []),
    ...(req.files?.file || []),
    ...(req.file ? [req.file] : [])
  ];

  if (!files.length) {
    throw new AppError("At least one image file is required", 400);
  }

  const data = await uploadService.uploadImages(files, req.body.scope);
  successResponse(res, data, "Images uploaded", 201);
});
