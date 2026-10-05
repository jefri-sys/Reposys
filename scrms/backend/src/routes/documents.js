const express = require('express');
const documentController = require('../controllers/documentController');
const { verifyToken } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');

const router = express.Router();

router.use(verifyToken);

router.post('/upload', uploadSingle, documentController.uploadDocument);
router.post('/upload-multiple', uploadMultiple, documentController.uploadMultipleDocuments);
router.get('/library', documentController.getLibrary);
router.get('/:id/url', documentController.getDocumentUrl);

module.exports = router;
