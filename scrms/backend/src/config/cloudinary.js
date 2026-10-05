const path = require('path');
const { v2: cloudinary } = require('cloudinary');

const DOCUMENTS_FOLDER = 'reposys/documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const CLOUDINARY_UPLOAD_TIMEOUT_MS = Number(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || 20000);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const generateUniqueFilename = async (originalname) => {
  const { v4: uuid } = await import('uuid');
  return `${uuid()}${path.extname(originalname || '')}`;
};

const getResourceTypeFromMime = (mimetype) => (
  IMAGE_MIME_TYPES.has(mimetype) ? 'image' : 'raw'
);

const uploadToCloudinary = async (buffer, originalname, mimetype) => {
  const uniqueFilename = await generateUniqueFilename(originalname);
  const resourceType = getResourceTypeFromMime(mimetype);
  const publicId = path.parse(uniqueFilename).name;

  return new Promise((resolve, reject) => {
    let settled = false;
    let uploadStream;
    const timeoutMs = Number.isFinite(CLOUDINARY_UPLOAD_TIMEOUT_MS) && CLOUDINARY_UPLOAD_TIMEOUT_MS > 0
      ? CLOUDINARY_UPLOAD_TIMEOUT_MS
      : 20000;
    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      uploadStream?.destroy?.();

      const timeoutError = new Error('Cloudinary upload timed out.');
      timeoutError.status = 503;
      reject(timeoutError);
    }, timeoutMs);

    const finish = (error, value) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);

      if (error) {
        reject(error);
        return;
      }

      resolve(value);
    };

    try {
      uploadStream = cloudinary.uploader.upload_stream(
        {
          filename_override: uniqueFilename,
          folder: DOCUMENTS_FOLDER,
          public_id: publicId,
          resource_type: resourceType,
          type: 'authenticated',
        },
        (error, result) => {
          if (error) {
            finish(error);
            return;
          }

          finish(null, {
            cloudinaryUrl: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      uploadStream.on('error', (error) => finish(error));
      uploadStream.end(buffer);
    } catch (error) {
      finish(error);
    }
  });
};

const findCloudinaryResource = async (publicId) => {
  for (const resourceType of ['image', 'raw']) {
    for (const type of ['authenticated', 'private', 'upload']) {
      try {
        const resource = await cloudinary.api.resource(publicId, { resource_type: resourceType, type });
        return {
          format: resource.format,
          publicId: resource.public_id,
          resourceType,
          type: resource.type || type,
        };
      } catch (error) {
        const statusCode = error?.http_code || error?.error?.http_code;
        const message = error?.message || error?.error?.message || '';
        const isNotFound = statusCode === 404 || /not found/i.test(message);

        if (!isNotFound) {
          throw error;
        }
      }
    }
  }

  const error = new Error(`Cloudinary asset not found for public ID: ${publicId}`);
  error.status = 404;
  throw error;
};

const getSignedUrl = async (publicId) => {
  const resource = await findCloudinaryResource(publicId);
  const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;

  return cloudinary.url(resource.publicId, {
    expires_at: expiresAt,
    format: resource.format,
    resource_type: resource.resourceType,
    type: resource.type,
    sign_url: true,
    secure: true,
  });
};

module.exports = {
  findCloudinaryResource,
  getSignedUrl,
  uploadToCloudinary,
};
