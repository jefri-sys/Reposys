const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const activityLogger = require('../utils/activityLogger');
const { createNotification } = require('../services/notificationService');
const socketHandler = require('../socket/socketHandler');
const { sendPushToRole } = require('../utils/pushService');

const getInventory = async (req, res, next) => {
  try {
    const items = await InventoryItem.find({})
      .populate('lastUpdatedBy', 'name role')
      .sort({ category: 1, name: 1 });

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
};

const getInventorySummary = async (req, res, next) => {
  try {
    const [itemsBelowThreshold, itemsGettingLow] = await Promise.all([
      InventoryItem.find({
        $expr: { $lte: ['$currentStock', '$minimumThreshold'] },
      })
        .populate('lastUpdatedBy', 'name role')
        .sort({ category: 1, name: 1 }),
      InventoryItem.find({
        $expr: {
          $and: [
            { $gt: ['$currentStock', '$minimumThreshold'] },
            { $lte: ['$currentStock', { $multiply: ['$minimumThreshold', 2] }] },
          ],
        },
      })
        .populate('lastUpdatedBy', 'name role')
        .sort({ category: 1, name: 1 }),
    ]);

    return res.status(200).json({
      itemsBelowThreshold,
      itemsGettingLow,
      count: itemsBelowThreshold.length,
    });
  } catch (error) {
    return next(error);
  }
};

const updateInventory = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    const nextStockValue = Number(req.body?.currentStock);
    if (!Number.isFinite(nextStockValue) || nextStockValue < 0) {
      return res.status(400).json({ success: false, message: 'currentStock must be 0 or greater.' });
    }

    const item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    const previousStock = item.currentStock;
    item.currentStock = nextStockValue;
    item.lastUpdatedBy = req.user.id;
    item.lastUpdatedAt = new Date();
    await item.save();

    await activityLogger.log({
      actionType: 'INVENTORY_UPDATE',
      performedBy: req.user.id,
      description: `Updated ${item.name} from ${previousStock} to ${nextStockValue} ${item.unit}`,
      affectedRecordId: item._id,
    });

    if (item.currentStock <= item.minimumThreshold) {
      await createNotification({
        recipientRole: 'Admin',
        title: 'Low Stock Alert',
        message: `${item.name} is at ${item.currentStock} ${item.unit} (threshold: ${item.minimumThreshold})`,
        type: 'inventory',
      });

      sendPushToRole('Staff', {
        title: 'Low Stock Alert',
        body: `${item.name} is low: ${item.currentStock} ${item.unit} remaining`,
        url: '/staff',
      }).catch(() => {});

      sendPushToRole('Admin', {
        title: 'Low Stock Alert',
        body: `${item.name} is low: ${item.currentStock} ${item.unit} remaining`,
        url: '/admin',
      }).catch(() => {});

      try {
        const io = socketHandler.getIO();
        const payload = {
          itemName: item.name,
          currentStock: item.currentStock,
          minimumThreshold: item.minimumThreshold,
        };

        io.to('staff').emit('inventory_alert', payload);
        io.to('admin').emit('inventory_alert', payload);
      } catch (socketError) {
        // Socket.io may not be initialized during isolated tests.
      }
    }

    await item.populate('lastUpdatedBy', 'name role');

    return res.status(200).json({
      success: true,
      item,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getInventory,
  getInventorySummary,
  updateInventory,
};
