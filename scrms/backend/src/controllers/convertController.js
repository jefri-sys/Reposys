const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

// Configure multer storage and file filter
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const isDocx = file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.originalname.toLowerCase().endsWith('.docx');
    if (isDocx) {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are accepted'), false);
    }
  }
});

/**
 * Controller to handle .docx to PDF conversion via CloudConvert API v2.
 */
const convertDocxToPdf = async (req, res) => {
  try {
    // VALIDATION
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const isDocx = req.file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || req.file.originalname.toLowerCase().endsWith('.docx');

    if (!isDocx) {
      return res.status(400).json({ message: 'Only .docx files are accepted' });
    }

    const rawApiKey = process.env.CLOUDCONVERT_API_KEY;
    const apiKey = (rawApiKey && rawApiKey !== 'your_key_here')
      ? rawApiKey
      : process.env['reposys-conversion'];

    if (!apiKey) {
      return res.status(500).json({ message: 'Conversion service not configured' });
    }

    const baseUrl = 'https://api.cloudconvert.com/v2';

    // Step 1 — Create a conversion job
    const jobResponse = await axios.post(
      `${baseUrl}/jobs`,
      {
        tasks: {
          'upload-file': {
            operation: 'import/upload'
          },
          'convert-file': {
            operation: 'convert',
            input: 'upload-file',
            input_format: 'docx',
            output_format: 'pdf',
            engine: 'office',
            optimize_print: true
          },
          'export-file': {
            operation: 'export/url',
            input: 'convert-file'
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Step 2 — Extract the upload task from the job response
    const job = jobResponse.data.data;
    const uploadTask = job.tasks.find(t => t.name === 'upload-file');
    const uploadUrl = uploadTask.result.form.url;
    const uploadParams = uploadTask.result.form.parameters;

    // Step 3 — Upload the .docx file to CloudConvert
    const formData = new FormData();
    Object.entries(uploadParams).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders()
    });

    // Step 4 — Wait for the job to complete by polling
    const jobId = job.id;
    let completedJob = null;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(
        `${baseUrl}/jobs/${jobId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` }
        }
      );
      
      const currentJob = statusResponse.data.data;
      
      if (currentJob.status === 'finished') {
        completedJob = currentJob;
        break;
      }
      
      if (currentJob.status === 'error') {
        throw new Error('CloudConvert conversion failed');
      }
      
      attempts++;
    }

    if (!completedJob) {
      throw new Error('Conversion timed out after 60 seconds');
    }

    // Step 5 — Get the download URL from the export task
    const exportTask = completedJob.tasks.find(
      t => t.name === 'export-file'
    );
    const downloadUrl = exportTask.result.files[0].url;
    const outputFilename = exportTask.result.files[0].filename;

    // Step 6 — Download the converted PDF from CloudConvert
    const pdfResponse = await axios.get(downloadUrl, {
      responseType: 'arraybuffer'
    });

    // Step 7 — Send the PDF back to the frontend
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${outputFilename}"`,
      'Content-Length': pdfResponse.data.length
    });
    return res.send(Buffer.from(pdfResponse.data));

  } catch (err) {
    console.error('CloudConvert error:', err.message);
    return res.status(500).json({
      message: 'Document conversion failed. Please upload a PDF instead.',
      error: err.message
    });
  }
};

module.exports = { convertDocxToPdf, upload };
