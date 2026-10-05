const express = require('express');
const router = express.Router();
const friendshipController = require('../controllers/friendshipController');
const { verifyToken } = require('../middleware/auth');

// Role-check middleware for Student/Faculty only. Rejects Staff and Admin with 403.
const studentFacultyOnly = (req, res, next) => {
  if (!req.user || !['Student', 'Faculty'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
};

router.get('/search', verifyToken, studentFacultyOnly, friendshipController.searchUsers);
router.post('/request', verifyToken, studentFacultyOnly, friendshipController.sendRequest);
router.post('/respond', verifyToken, friendshipController.respondToRequest);
router.get('/', verifyToken, friendshipController.getFriends);
router.get('/pending', verifyToken, friendshipController.getPendingRequests);
router.delete('/:friendshipId', verifyToken, friendshipController.removeFriend);

module.exports = router;
