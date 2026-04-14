const { Readable } = require("stream");

const env = require("../../config/env");
const { ensureCloudinaryConfigured } = require("../../config/cloudinary");

const allowedScopes = {
  product: "products",
  avatar: "avatars",
  kyc: "kyc"
};

function uploadSingle(file, scope = "product") {
  return new Promise((resolve, reject) => {
    const cloudinary = ensureCloudinaryConfigured();
    const normalizedScope = allowedScopes[scope] || allowedScopes.product;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.cloudinaryFolder}/${normalizedScope}`,
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          originalName: file.originalname
        });
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
}

exports.uploadImage = uploadSingle;
exports.uploadImages = async (files, scope = "product") => Promise.all(files.map((file) => uploadSingle(file, scope)));
