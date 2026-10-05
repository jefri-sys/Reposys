const express = require('express');
const router = express.Router();
const { convertDocxToPdf, upload } = require('../controllers/convertController');
const { verifyToken } = require('../middleware/auth');

router.post(
  '/docx',
  verifyToken,
  upload.single('file'),
  convertDocxToPdf
);

module.exports = router;
