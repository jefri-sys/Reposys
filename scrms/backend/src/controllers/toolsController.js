const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const sharp = require('sharp');
const JSZip = require('jszip');
const mammoth = require('mammoth');
const PDFKitDocument = require('pdfkit');
const { PDFDocument } = require('pdf-lib');

const execFileAsync = promisify(execFile);
const SOFFICE_BINARY = process.env.SOFFICE_BINARY || 'soffice';
const TEMP_DIRECTORY = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_PAGE_SIZES = Object.freeze({
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  LEGAL: { width: 612, height: 1008 },
});

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const cleanupFiles = async (filePaths) => {
  await Promise.all(filePaths.map(async (filePath) => {
    if (!filePath) {
      return;
    }

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Failed to remove temp file: ${filePath}`, error);
      }
    }
  }));
};

const getMimeType = (file) => file?.detectedMimeType || file?.mimetype || '';

const getFileKind = (file) => {
  const mimeType = getMimeType(file);
  const extension = path.extname(file?.originalname || '').toLowerCase();

  if (mimeType === 'application/pdf' || extension === '.pdf') {
    return 'pdf';
  }

  if (mimeType === DOCX_MIME_TYPE || extension === '.docx') {
    return 'docx';
  }

  if (mimeType === 'application/msword' || extension === '.doc') {
    return 'doc';
  }

  if (mimeType === 'image/jpeg' || extension === '.jpg' || extension === '.jpeg') {
    return 'jpeg';
  }

  if (mimeType === 'image/png' || extension === '.png') {
    return 'png';
  }

  return 'unknown';
};

const getBaseFilename = (originalname, fallbackName) => {
  const basename = path.parse(originalname || '').name.trim();
  return basename || fallbackName;
};

const sendDownload = (res, buffer, filename, contentType) => {
  return res
    .status(200)
    .set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    })
    .send(buffer);
};

const escapeXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const createDocxFromText = async (text) => {
  const zip = new JSZip();
  const paragraphs = String(text || 'Converted document')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const body = (paragraphs.length ? paragraphs : ['Converted document'])
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join('');

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="${DOCX_MIME_TYPE}.main+xml"/>
</Types>`);
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  return zip.generateAsync({ type: 'nodebuffer' });
};

const createPdfFromText = (text) => new Promise((resolve, reject) => {
  const document = new PDFKitDocument({ size: 'A4', margin: 54 });
  const chunks = [];

  document.on('data', (chunk) => chunks.push(chunk));
  document.on('end', () => resolve(Buffer.concat(chunks)));
  document.on('error', reject);
  document.fontSize(12).text(text || 'Converted document', {
    align: 'left',
    lineGap: 4,
  });
  document.end();
});

const fallbackPdfToDocx = async (file) => {
  const pdfDocument = await PDFDocument.load(file.buffer);
  const pageCount = pdfDocument.getPageCount();
  const sourceName = file.originalname || 'uploaded.pdf';

  return createDocxFromText([
    `Converted from ${sourceName}`,
    `Page count: ${pageCount}`,
    '',
    'LibreOffice is not available on this server, so Reposys generated a basic DOCX wrapper for this PDF.',
  ].join('\n'));
};

const fallbackDocxToPdf = async (file) => {
  const result = await mammoth.extractRawText({ buffer: file.buffer });
  return createPdfFromText(result.value || `Converted from ${file.originalname || 'uploaded.docx'}`);
};

const requireFile = (req) => {
  if (!req.file) {
    throw createHttpError(400, 'File is required.');
  }

  return req.file;
};

const parsePositiveNumber = (value, label) => {
  const parsedValue = Number.parseFloat(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw createHttpError(400, `${label} must be a positive number.`);
  }

  return parsedValue;
};

const parseQuality = (value) => {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 100) {
    throw createHttpError(400, 'Quality must be an integer between 1 and 100.');
  }

  return parsedValue;
};

const resolvePdfTargetSize = (body = {}) => {
  const normalizedTargetSize = String(body.targetSize || '').trim().toUpperCase();

  if (normalizedTargetSize && normalizedTargetSize !== 'CUSTOM') {
    const preset = PDF_PAGE_SIZES[normalizedTargetSize];

    if (!preset) {
      throw createHttpError(400, 'targetSize must be A4, A3, Legal, or Custom.');
    }

    return preset;
  }

  return {
    width: parsePositiveNumber(body.width, 'Width'),
    height: parsePositiveNumber(body.height, 'Height'),
  };
};

const runSofficeConversion = async ({
  buffer,
  inputExtension,
  outputExtension,
  outputFormat,
}) => {
  const tempId = crypto.randomUUID();
  const inputPath = path.join(TEMP_DIRECTORY, `${tempId}${inputExtension}`);
  const outputPath = path.join(TEMP_DIRECTORY, `${tempId}.${outputExtension}`);

  try {
    await fs.mkdir(TEMP_DIRECTORY, { recursive: true });
    await fs.writeFile(inputPath, buffer);

    try {
      await execFileAsync(SOFFICE_BINARY, [
        '--headless',
        '--convert-to',
        outputFormat,
        inputPath,
        '--outdir',
        TEMP_DIRECTORY,
      ]);
    } catch (error) {
      if (
        ['ENOENT', 'EPERM'].includes(error.code)
        || /spawn enoent|spawn eperm|not recognized/i.test(error.message || '')
      ) {
        throw createHttpError(
          503,
          'LibreOffice conversion is not available on this server. Install soffice or set SOFFICE_BINARY.'
        );
      }

      throw createHttpError(500, 'The document could not be converted.');
    }

    try {
      await fs.access(outputPath);
    } catch {
      throw createHttpError(500, 'The document conversion did not produce an output file.');
    }

    return await fs.readFile(outputPath);
  } finally {
    await cleanupFiles([inputPath, outputPath]);
  }
};

const normalizeToolError = (error) => {
  if (error?.status) {
    return error;
  }

  const message = error?.message || '';

  if (/unsupported image format|input buffer contains unsupported image format/i.test(message)) {
    return createHttpError(400, 'The uploaded image could not be processed.');
  }

  if (/encrypted pdf|password/i.test(message)) {
    return createHttpError(400, 'Password-protected PDFs cannot be processed.');
  }

  if (/no pdf header|invalid pdf|failed to parse pdf|corrupt/i.test(message)) {
    return createHttpError(400, 'The uploaded PDF could not be processed.');
  }

  return error;
};

const handleControllerError = (res, next, error) => {
  const normalizedError = normalizeToolError(error);

  if (normalizedError.status) {
    return res.status(normalizedError.status).json({
      success: false,
      message: normalizedError.message,
    });
  }

  return next(normalizedError);
};

exports.convertDocument = async (req, res, next) => {
  try {
    const file = requireFile(req);
    const fileKind = getFileKind(file);

    if (fileKind !== 'pdf' && fileKind !== 'docx') {
      throw createHttpError(400, 'Only PDF and DOCX files are supported');
    }

    const rawApiKey = process.env.CLOUDCONVERT_API_KEY;
    const CLOUDCONVERT_API_KEY = (rawApiKey && rawApiKey !== 'your_key_here')
      ? rawApiKey
      : process.env['reposys-conversion'];

    if (!CLOUDCONVERT_API_KEY) {
      throw createHttpError(500, 'Conversion service not configured');
    }

    const CC_BASE = 'https://api.cloudconvert.com/v2';
    const inputBuffer = file.buffer;
    const originalName = file.originalname;
    const mimeType = file.mimetype || (fileKind === 'pdf' ? 'application/pdf' : DOCX_MIME_TYPE);

    const inputFormat = fileKind;
    const outputFormat = fileKind === 'pdf' ? 'docx' : 'pdf';
    const outputName = originalName.replace(/\.(pdf|docx)$/i, `.${outputFormat}`);

    // Step 1: Create a CloudConvert Job with 3 tasks
    const jobResponse = await axios.post(
      `${CC_BASE}/jobs`,
      {
        tasks: {
          'upload-file': {
            operation: 'import/upload',
          },
          'convert-file': {
            operation: 'convert',
            input: 'upload-file',
            input_format: inputFormat,
            output_format: outputFormat,
            // Optional: engine hints for better quality
            ...(outputFormat === 'docx' && {
              engine: 'calibre', // Better PDF→DOCX fidelity
            }),
          },
          'export-file': {
            operation: 'export/url',
            input: 'convert-file',
            inline: false,
            archive_multiple_files: false,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const job = jobResponse.data.data;
    const uploadTask = job.tasks.find((t) => t.name === 'upload-file');

    if (!uploadTask || !uploadTask.result?.form) {
      throw createHttpError(500, 'CloudConvert did not return upload form');
    }

    // Step 2: Upload the file to CloudConvert's S3 endpoint
    const { url: uploadUrl, parameters: uploadParams } = uploadTask.result.form;

    const formData = new FormData();
    // CloudConvert requires all form params BEFORE the file field
    Object.entries(uploadParams).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append('file', inputBuffer, {
      filename: originalName,
      contentType: mimeType,
    });

    await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // Step 3: Poll the job until it's finished
    let completedJob = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 2000)); // wait 2s between polls

      const pollResponse = await axios.get(`${CC_BASE}/jobs/${job.id}`, {
        headers: { Authorization: `Bearer ${CLOUDCONVERT_API_KEY}` },
      });

      const polledJob = pollResponse.data.data;

      if (polledJob.status === 'finished') {
        completedJob = polledJob;
        break;
      }

      if (polledJob.status === 'error') {
        const failedTask = polledJob.tasks.find((t) => t.status === 'error');
        throw createHttpError(500, `CloudConvert conversion failed: ${failedTask?.message || 'Unknown error'}`);
      }
    }

    if (!completedJob) {
      throw createHttpError(504, 'Conversion timed out after 60 seconds');
    }

    // Step 4: Get the export URL
    const exportTask = completedJob.tasks.find((t) => t.name === 'export-file');
    const exportedFile = exportTask?.result?.files?.[0];

    if (!exportedFile?.url) {
      throw createHttpError(500, 'No output file URL from CloudConvert');
    }

    // Step 5: Download converted file and stream it back to client
    const fileResponse = await axios.get(exportedFile.url, {
      responseType: 'arraybuffer',
    });

    const contentType = outputFormat === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return sendDownload(res, Buffer.from(fileResponse.data), outputName, contentType);

  } catch (error) {
    console.error('Convert error:', error?.response?.data || error.message);
    return handleControllerError(res, next, error);
  }
};

exports.resizeImage = async (req, res, next) => {
  try {
    const file = requireFile(req);
    const fileKind = getFileKind(file);

    if (!['jpeg', 'png'].includes(fileKind)) {
      throw createHttpError(400, 'Only JPEG and PNG images can be resized.');
    }

    const width = parsePositiveNumber(req.body.width, 'Width');
    const height = parsePositiveNumber(req.body.height, 'Height');
    const imagePipeline = sharp(file.buffer).resize(width, height);
    const outputBuffer = fileKind === 'png'
      ? await imagePipeline.png().toBuffer()
      : await imagePipeline.jpeg().toBuffer();
    const basename = getBaseFilename(file.originalname, 'resized-image');

    return sendDownload(
      res,
      outputBuffer,
      `${basename}-resized.${fileKind === 'png' ? 'png' : 'jpg'}`,
      fileKind === 'png' ? 'image/png' : 'image/jpeg'
    );
  } catch (error) {
    return handleControllerError(res, next, error);
  }
};

exports.compressImage = async (req, res, next) => {
  try {
    const file = requireFile(req);
    const fileKind = getFileKind(file);

    if (!['jpeg', 'png'].includes(fileKind)) {
      throw createHttpError(400, 'Only JPEG and PNG images can be compressed.');
    }

    const quality = parseQuality(req.body.quality);
    const outputBuffer = fileKind === 'png'
      ? await sharp(file.buffer).png({
        compressionLevel: Math.floor((100 - quality) / 10),
      }).toBuffer()
      : await sharp(file.buffer).jpeg({ quality }).toBuffer();
    const basename = getBaseFilename(file.originalname, 'compressed-image');

    return sendDownload(
      res,
      outputBuffer,
      `${basename}-compressed.${fileKind === 'png' ? 'png' : 'jpg'}`,
      fileKind === 'png' ? 'image/png' : 'image/jpeg'
    );
  } catch (error) {
    return handleControllerError(res, next, error);
  }
};

exports.resizePdfPages = async (req, res, next) => {
  try {
    const file = requireFile(req);

    if (getFileKind(file) !== 'pdf') {
      throw createHttpError(400, 'Only PDF files can be resized.');
    }

    const { width, height } = resolvePdfTargetSize(req.body);
    const pdfDocument = await PDFDocument.load(file.buffer);

    pdfDocument.getPages().forEach((page) => {
      const currentWidth = page.getWidth();
      const currentHeight = page.getHeight();
      const scaleX = width / currentWidth;
      const scaleY = height / currentHeight;

      page.setSize(width, height);
      page.scaleContent(scaleX, scaleY);
      page.scaleAnnotations(scaleX, scaleY);
    });

    const outputBuffer = Buffer.from(await pdfDocument.save());
    const basename = getBaseFilename(file.originalname, 'resized-document');

    return sendDownload(res, outputBuffer, `${basename}-resized.pdf`, 'application/pdf');
  } catch (error) {
    return handleControllerError(res, next, error);
  }
};
