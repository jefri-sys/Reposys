const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinaryConfig');
const uploadController = require('../controllers/uploadController');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, upload.single('file'), uploadController.uploadMedia);

// Error handling middleware for multer errors in this route
router.use((err, req, res, next) => {
  if (err && err.message === 'Only JPEG, PNG, and PDF files are allowed') {
    return res.status(400).json({ message: err.message });
  }
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large' });
  }
  next(err);
});

module.exports = router;
