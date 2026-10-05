const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');
const { uploadAudio } = require('../config/cloudinaryConfig');

router.use(verifyToken);

router.post('/send', messageController.sendMessage);
router.post('/send-voice/:receiverId', uploadAudio.single('audio'), messageController.sendVoiceMessage);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/conversations', messageController.getConversationList);
router.get('/:friendId', messageController.getConversation);
router.put('/:friendId/read', messageController.markRead);
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;
