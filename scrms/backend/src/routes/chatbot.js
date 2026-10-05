const express = require('express');
const chatbotController = require('../controllers/chatbotController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.post('/ask', chatbotController.askChatbot);

module.exports = router;
