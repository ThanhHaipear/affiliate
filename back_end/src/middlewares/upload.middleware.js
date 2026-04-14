const multer = require("multer");

const env = require("../config/env");
const AppError = require("../utils/app-error");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.uploadMaxFileSizeMb * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new AppError("Only image files are allowed", 400));
      return;
    }

    cb(null, true);
  }
});

function handleUploadError(error, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(new AppError(`File size exceeds ${env.uploadMaxFileSizeMb}MB`, 400));
    }

    return next(new AppError(error.message, 400));
  }

  if (error) {
    return next(error);
  }

  return next();
}

exports.uploadImageFields = () => (req, res, next) => {
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "files", maxCount: 10 }
  ])(req, res, (error) => handleUploadError(error, next));
};
