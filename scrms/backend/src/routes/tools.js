const express = require('express');
const toolsController = require('../controllers/toolsController');
const { verifyToken } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

router.use(verifyToken);

router.post('/convert', uploadSingle, toolsController.convertDocument);
router.post('/resize-image', uploadSingle, toolsController.resizeImage);
router.post('/compress-image', uploadSingle, toolsController.compressImage);
router.post('/resize-pdf-pages', uploadSingle, toolsController.resizePdfPages);

module.exports = router;
