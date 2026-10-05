const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { PDFDocument } = require('pdf-lib');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const { uploadToCloudinary, getSignedUrl } = require('../config/cloudinary');
const { getPageCount, detectBlankAndQualityIssues, analyzeImageQuality } = require('../services/aiAnalysis');

const execFileAsync = promisify(execFile);
const OFFICE_FILE_TYPES = new Set(['doc', 'docx']);
const IMAGE_FILE_TYPES = new Set(['jpg', 'png']);
const PRIVILEGED_ROLES = new Set(['Staff', 'Admin']);
const TEMP_DIRECTORY = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const DOCUMENT_ANALYSIS_TIMEOUT_MS = Number(process.env.DOCUMENT_ANALYSIS_TIMEOUT_MS || 10000);
const DOCUMENT_PAGE_COUNT_TIMEOUT_MS = Number(process.env.DOCUMENT_PAGE_COUNT_TIMEOUT_MS || 10000);
const DOCUMENT_SAVE_TIMEOUT_MS = Number(process.env.DOCUMENT_SAVE_TIMEOUT_MS || 8000);
const OFFICE_CONVERSION_TIMEOUT_MS = Number(process.env.OFFICE_CONVERSION_TIMEOUT_MS || 15000);

const emptyAnalysisResults = () => ({
  blankPages: [],
  qualityIssues: [],
  colourHeavyPages: [],
});

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const getPositiveTimeout = (value, fallback) => (
  Number.isFinite(value) && value > 0 ? value : fallback
);

const normalizeUploadError = (error) => {
  if (error?.status) {
    return error;
  }

  const message = error?.message || '';

  if (/cloudinary|api key|upload_stream|public_id|resource_type/i.test(message)) {
    return createHttpError(503, 'Document storage is temporarily unavailable. Please try again in a moment.');
  }

  if (/invalid pdf|failed to parse pdf|no pdf header|end-of-stream|corrupt/i.test(message)) {
    return createHttpError(400, 'The uploaded file could not be read. Please try a clean PDF, Word file, or image.');
  }

  return error;
};

const cleanupFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Failed to clean up temp file: ${filePath}`, error);
    }
  }
};

const getEffectiveMimeType = (file) => file.detectedMimeType || file.mimetype;

const getNormalizedFileType = (file) => {
  switch (getEffectiveMimeType(file)) {
    case 'application/pdf':
      return 'pdf';
    case 'application/msword':
      return 'doc';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      break;
  }

  const extension = path.extname(file.originalname || '').toLowerCase();

  if (extension === '.pdf') {
    return 'pdf';
  }

  if (extension === '.doc') {
    return 'doc';
  }

  if (extension === '.docx') {
    return 'docx';
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'jpg';
  }

  if (extension === '.png') {
    return 'png';
  }

  throw createHttpError(400, 'Invalid file type. Only PDF, DOC, DOCX, JPG, PNG allowed.');
};

const convertOfficeDocumentToPdf = async (buffer, originalname) => {
  const tempId = crypto.randomUUID();
  const extension = path.extname(originalname || '') || '.docx';
  const inputPath = path.join(TEMP_DIRECTORY, `${tempId}${extension}`);
  const outputPath = path.join(TEMP_DIRECTORY, `${tempId}.pdf`);

  try {
    await fs.mkdir(TEMP_DIRECTORY, { recursive: true });
    await fs.writeFile(inputPath, buffer);

    try {
      await execFileAsync(
        'soffice',
        [
          '--headless',
          '--convert-to',
          'pdf',
          inputPath,
          '--outdir',
          TEMP_DIRECTORY,
        ],
        {
          timeout: getPositiveTimeout(OFFICE_CONVERSION_TIMEOUT_MS, 15000),
        }
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw createHttpError(
          400,
          'DOCX conversion is not available on this server. Please upload a PDF instead.'
        );
      }

      if (error.killed || error.signal === 'SIGTERM') {
        throw createHttpError(
          422,
          'DOCX conversion took too long. Please export the file as PDF and upload it again.'
        );
      }

      throw error;
    }

    return await fs.readFile(outputPath);
  } finally {
    await Promise.all([
      cleanupFile(inputPath),
      cleanupFile(outputPath),
    ]);
  }
};

const convertImageToPdf = async (buffer, mimetype) => {
  const pdfDoc = await PDFDocument.create();
  const embeddedImage = mimetype === 'image/png'
    ? await pdfDoc.embedPng(buffer)
    : await pdfDoc.embedJpg(buffer);

  const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: embeddedImage.width,
    height: embeddedImage.height,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

const buildAnalysisBuffer = async (file, fileType) => {
  if (fileType === 'pdf') {
    return file.buffer;
  }

  if (OFFICE_FILE_TYPES.has(fileType)) {
    return convertOfficeDocumentToPdf(file.buffer, file.originalname);
  }

  if (IMAGE_FILE_TYPES.has(fileType)) {
    return convertImageToPdf(file.buffer, getEffectiveMimeType(file));
  }

  throw createHttpError(400, 'Invalid file type. Only PDF, DOC, DOCX, JPG, PNG allowed.');
};

const withTimeout = (promise, timeoutMs, message, status = 503) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(createHttpError(status, message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise])
    .finally(() => clearTimeout(timeoutId));
};

const analyzeFileSafely = async (file, fileType, pdfBuffer) => {
  try {
    return await withTimeout(
      IMAGE_FILE_TYPES.has(fileType)
        ? analyzeImageQuality(file.buffer)
        : detectBlankAndQualityIssues(pdfBuffer),
      getPositiveTimeout(DOCUMENT_ANALYSIS_TIMEOUT_MS, 10000),
      'Document quality analysis timed out.'
    );
  } catch (error) {
    console.warn('Document quality analysis skipped:', error);
    return emptyAnalysisResults();
  }
};

const processUploadedFile = async (file, authUser) => {
  const fileType = getNormalizedFileType(file);
  const pdfBuffer = await buildAnalysisBuffer(file, fileType);
  const pageCountResult = await withTimeout(
    getPageCount(pdfBuffer),
    getPositiveTimeout(DOCUMENT_PAGE_COUNT_TIMEOUT_MS, 10000),
    'The uploaded document took too long to inspect. Please try a compressed PDF or a cleaner export.',
    422
  );
  const isGuest = authUser?.isGuest === true;

  if (pageCountResult.isPasswordProtected) {
    throw createHttpError(400, 'This PDF is password-protected and cannot be processed.');
  }

  const [{ cloudinaryUrl, publicId }, analysisResults] = await Promise.all([
    uploadToCloudinary(
      file.buffer,
      file.originalname,
      getEffectiveMimeType(file)
    ),
    analyzeFileSafely(file, fileType, pdfBuffer),
  ]);

  const document = await withTimeout(
    Document.create({
      cloudinaryUrl,
      publicId,
      originalFilename: file.originalname,
      fileType,
      pageCount: pageCountResult.pageCount,
      analysisResults: {
        blankPages: analysisResults.blankPages,
        qualityIssues: analysisResults.qualityIssues,
        isPasswordProtected: false,
        colourHeavyPages: analysisResults.colourHeavyPages,
      },
      ownerId: isGuest ? undefined : authUser.id,
      isGuest,
      guestSessionId: isGuest ? authUser.sessionId : undefined,
    }),
    getPositiveTimeout(DOCUMENT_SAVE_TIMEOUT_MS, 8000),
    'Document storage completed, but saving the upload record took too long. Please try again.',
    503
  );

  return {
    documentId: document._id,
    pageCount: document.pageCount,
    blankPages: document.analysisResults.blankPages,
    qualityIssues: document.analysisResults.qualityIssues,
    colourHeavyPages: document.analysisResults.colourHeavyPages,
    cloudinaryUrl: document.cloudinaryUrl,
    originalFilename: document.originalFilename,
    fileType: document.fileType,
  };
};

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required.' });
    }

    const result = await processUploadedFile(req.file, req.user);
    return res.status(201).json(result);
  } catch (error) {
    const normalizedError = normalizeUploadError(error);

    if (normalizedError.status) {
      return res.status(normalizedError.status).json({
        success: false,
        message: normalizedError.message,
      });
    }

    return next(normalizedError);
  }
};

exports.uploadMultipleDocuments = async (req, res, next) => {
  try {
    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one file is required.' });
    }

    const results = await Promise.all(
      req.files.map((file) => processUploadedFile(file, req.user))
    );

    const summedPageCount = results.reduce((total, result) => total + result.pageCount, 0);

    return res.status(201).json({
      results,
      summedPageCount,
    });
  } catch (error) {
    const normalizedError = normalizeUploadError(error);

    if (normalizedError.status) {
      return res.status(normalizedError.status).json({ message: normalizedError.message });
    }

    return next(normalizedError);
  }
};

exports.getLibrary = async (req, res, next) => {
  try {
    const documents = await Document.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ documents });
  } catch (error) {
    return next(error);
  }
};

exports.getDocumentUrl = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const isGuestOwner = document.isGuest === true && req.user.isGuest === true && document.guestSessionId === req.user.sessionId;
    const isOwner = isGuestOwner || (document.ownerId && document.ownerId.toString() === req.user.id);
    const isPrivilegedUser = PRIVILEGED_ROLES.has(req.user.role);

    if (!isOwner && !isPrivilegedUser) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const signedUrl = await getSignedUrl(document.publicId);
    return res.status(200).json({ url: signedUrl });
  } catch (error) {
    return next(error);
  }
};
