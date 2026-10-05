const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, ratingController.createRating);
router.get('/my-ratings', verifyToken, ratingController.getMyRatings);

module.exports = router;
