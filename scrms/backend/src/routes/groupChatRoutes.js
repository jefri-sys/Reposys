const express = require('express');
const router = express.Router();
const groupChatController = require('../controllers/groupChatController');
const { verifyToken } = require('../middleware/auth');

const { uploadAudio } = require('../config/cloudinaryConfig');

router.post('/', verifyToken, groupChatController.createGroup);
router.get('/', verifyToken, groupChatController.getGroups);
router.get('/:groupId/messages', verifyToken, groupChatController.getGroupMessages);
router.post('/:groupId/messages', verifyToken, groupChatController.sendGroupMessage);
router.post('/:groupId/send-voice', verifyToken, uploadAudio.single('audio'), groupChatController.sendGroupVoiceMessage);
router.post('/:groupId/add-member', verifyToken, groupChatController.addMember);
router.delete('/:groupId/remove-member', verifyToken, groupChatController.removeMember);
router.post('/:groupId/leave', verifyToken, groupChatController.leaveGroup);
router.post('/:groupId/disband', verifyToken, groupChatController.disbandGroup);
router.post('/:groupId/delete-chat', verifyToken, groupChatController.deleteGroupChat);

module.exports = router;
