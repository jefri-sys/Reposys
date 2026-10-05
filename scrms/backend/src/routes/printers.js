const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const printerController = require('../controllers/printerController');

router.post('/agents/register', printerController.registerAgent);

router.use(verifyToken);
router.use(roleGuard('Admin', 'Staff'));

router.get('/print-agents/connected', printerController.getConnectedAgents);
router.get('/pending', printerController.getPendingPrinters);
router.get('/', printerController.getPrinters);
router.post('/', printerController.createPrinter);
router.patch('/:id', printerController.updatePrinter);
router.patch('/:id/configure', printerController.configurePrinter);
router.delete('/:id', printerController.deletePrinter);

module.exports = router;
