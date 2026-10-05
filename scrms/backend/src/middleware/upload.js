const path = require('path');
const multer = require('multer');
const JSZip = require('jszip');

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const INVALID_FILE_TYPE_MESSAGE = 'Invalid file type. Only PDF, DOC, DOCX, JPG, PNG allowed.';
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);
const EXTENSION_TO_MIME = Object.freeze({
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

const getFilesFromRequest = (req) => {
  if (req.file) {
    return [req.file];
  }

  if (Array.isArray(req.files)) {
    return req.files;
  }

  return [];
};

const resolveDetectedMimeType = (file, detectedType) => {
  const fileExtension = path.extname(file.originalname || '').toLowerCase();
  const extensionMimeType = EXTENSION_TO_MIME[fileExtension];

  if (!extensionMimeType) {
    return null;
  }

  if (detectedType?.mime && ALLOWED_MIME_TYPES.has(detectedType.mime)) {
    return detectedType.mime === extensionMimeType ? detectedType.mime : null;
  }

  return null;
};

const hasPdfSignature = (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-';

const hasLegacyDocSignature = (buffer) => {
  const cfbSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  return buffer.length >= cfbSignature.length && buffer.subarray(0, cfbSignature.length).equals(cfbSignature);
};

const isValidDocx = async (buffer) => {
  try {
    const zip = await JSZip.loadAsync(buffer);
    return Boolean(zip.file('[Content_Types].xml') && zip.file('word/document.xml'));
  } catch (error) {
    return false;
  }
};

const validateFileSignature = async (file, detectedType) => {
  const fileExtension = path.extname(file.originalname || '').toLowerCase();

  if (fileExtension === '.pdf') {
    return hasPdfSignature(file.buffer) ? 'application/pdf' : null;
  }

  if (fileExtension === '.doc') {
    return hasLegacyDocSignature(file.buffer) ? 'application/msword' : null;
  }

  if (fileExtension === '.docx') {
    return await isValidDocx(file.buffer)
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : null;
  }

  return resolveDetectedMimeType(file, detectedType);
};

const validateMimeTypes = async (files) => {
  const { fileTypeFromBuffer } = await import('file-type');

  for (const file of files) {
    const detectedType = await fileTypeFromBuffer(file.buffer);
    const detectedMimeType = await validateFileSignature(file, detectedType);

    if (!detectedMimeType || !ALLOWED_MIME_TYPES.has(detectedMimeType)) {
      const error = new Error(INVALID_FILE_TYPE_MESSAGE);
      error.status = 400;
      throw error;
    }

    file.detectedMimeType = detectedMimeType;
    file.mimetype = detectedMimeType;
  }
};

const withMimeValidation = (multerMiddleware) => {
  return (req, res, next) => {
    multerMiddleware(req, res, async (error) => {
      if (error) {
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds 25MB limit.',
          });
        }

        if (error instanceof multer.MulterError) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }

        return next(error);
      }

      try {
        const files = getFilesFromRequest(req);

        if (files.length > 0) {
          await validateMimeTypes(files);
        }

        return next();
      } catch (validationError) {
        if (validationError.status === 400) {
          return res.status(400).json({
            success: false,
            message: validationError.message,
          });
        }

        return next(validationError);
      }
    });
  };
};

const uploadSingle = withMimeValidation(upload.single('file'));
const uploadMultiple = withMimeValidation(upload.array('files', 10));

module.exports = {
  uploadSingle,
  uploadMultiple,
};
