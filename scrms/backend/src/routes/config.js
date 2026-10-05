const express = require('express');
const configController = require('../controllers/configController');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const SystemConfig = require('../models/SystemConfig');

const router = express.Router();

router.get('/shop-status', configController.getShopStatus);
router.get('/limits', configController.getLimits);
router.get('/push', configController.getPushConfig);

router.patch('/spae/toggle', verifyToken, roleGuard('Admin'), async (req, res, next) => {
  try {
    const config = await SystemConfig.getInstance();
    config.spae.enabled = !config.spae.enabled;
    await config.save();
    return res.json({ success: true, enabled: config.spae.enabled });
  } catch (error) {
    return next(error);
  }
});

router.patch('/printers/:printerId/toggle', verifyToken, roleGuard('Admin'), async (req, res, next) => {
  try {
    const config = await SystemConfig.getInstance();
    const printer = config.printers.find((p) => p.printerId === req.params.printerId);
    if (!printer) {
      return res.status(404).json({ message: 'Printer not found' });
    }
    printer.isOnline = !printer.isOnline;
    config.markModified('printers');
    await config.save();
    return res.json({ success: true, printer });
  } catch (error) {
    return next(error);
  }
});

router.post('/printers', verifyToken, roleGuard('Admin'), async (req, res, next) => {
  try {
    const { printerId, name, capabilities = {} } = req.body;
    if (!printerId || !name) {
      return res.status(400).json({ message: 'Printer ID and name are required' });
    }
    const config = await SystemConfig.getInstance();
    const existing = config.printers.find((p) => p.printerId === printerId);
    if (existing) {
      return res.status(400).json({ message: 'Printer ID already exists' });
    }
    config.printers.push({
      printerId,
      name,
      capabilities: {
        color: !!capabilities.color,
        a3: !!capabilities.a3,
        duplex: capabilities.duplex !== false,
      },
      isOnline: true,
      isDefault: false,
    });
    config.markModified('printers');
    await config.save();
    return res.json({ success: true, printers: config.printers });
  } catch (error) {
    return next(error);
  }
});

router.delete('/printers/:printerId', verifyToken, roleGuard('Admin'), async (req, res, next) => {
  try {
    const config = await SystemConfig.getInstance();
    const index = config.printers.findIndex((p) => p.printerId === req.params.printerId);
    if (index === -1) {
      return res.status(404).json({ message: 'Printer not found' });
    }
    
    const isDeletingDefault = config.printers[index].isDefault;
    if (isDeletingDefault && config.printers.length === 1) {
      return res.status(400).json({ message: 'Cannot delete the only default printer' });
    }

    config.printers.splice(index, 1);
    config.markModified('printers');
    await config.save();
    return res.json({ success: true, printers: config.printers });
  } catch (error) {
    return next(error);
  }
});

router.patch('/printers/:printerId/set-default', verifyToken, roleGuard('Admin'), async (req, res, next) => {
  try {
    const config = await SystemConfig.getInstance();
    const printer = config.printers.find((p) => p.printerId === req.params.printerId);
    if (!printer) {
      return res.status(404).json({ message: 'Printer not found' });
    }
    config.printers.forEach((p) => {
      p.isDefault = false;
    });
    printer.isDefault = true;
    config.markModified('printers');
    await config.save();
    return res.json({ success: true, printers: config.printers });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
