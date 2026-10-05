const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

const router = express.Router();

router.use(verifyToken);
router.use(roleGuard('Staff', 'Admin'));

router.get('/', inventoryController.getInventory);
router.get('/summary', inventoryController.getInventorySummary);
router.patch('/:id/update', inventoryController.updateInventory);

module.exports = router;
