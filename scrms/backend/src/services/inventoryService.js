const InventoryItem = require('../models/InventoryItem')
const { createNotification } = require('./notificationService')
const activityLogger = require('../utils/activityLogger')
const { sendPushToRole } = require('../utils/pushService')

// Calculate what an order consumes
const calculateConsumption = (order) => {
  const { serviceType, printConfig, pageCount } = order
  const copies = printConfig?.copies || 1
  const paperSize = printConfig?.paperSize || 'A4'
  const binding = printConfig?.binding || 'None'
  const colourMode = printConfig?.colourMode || 'BlackAndWhite'
  const consumption = []

  if (serviceType === 'Scanning' || serviceType === 'Conversion') {
    return [] // No physical materials consumed
  }

  if (serviceType === 'Printing' || serviceType === 'Photocopying') {
    const sheets = pageCount * copies
    const paperName = paperSize === 'A3' ? 'A3 Paper' : 'A4 Paper'
    consumption.push({ name: paperName, quantity: sheets })

    if (colourMode === 'Colour') {
      consumption.push({ name: 'Colour Toner', quantity: 1 })
    } else {
      consumption.push({ name: 'Black Toner', quantity: 1 })
    }
  }

  if (serviceType === 'Binding') {
    const sheets = pageCount * copies
    consumption.push({ name: 'A4 Paper', quantity: sheets })

    if (binding === 'Spiral') {
      consumption.push({ name: 'Spiral Rolls', quantity: copies })
    } else if (binding === 'Staple') {
      consumption.push({ name: 'Comb Strips', quantity: copies })
    }
  }

  return consumption
}

// Main deduction function — called after order completion
const deductInventory = async (order) => {
  try {
    const consumption = calculateConsumption(order)
    if (consumption.length === 0) return

    const alertsFired = []

    for (const item of consumption) {
      const inventoryItem = await InventoryItem.findOne({
        name: { $regex: new RegExp(item.name, 'i') }
      })

      if (!inventoryItem) {
        console.warn(`Inventory item not found: ${item.name}`)
        continue
      }

      const previousStock = inventoryItem.currentStock
      const newStock = Math.max(0, previousStock - item.quantity)

      await InventoryItem.findByIdAndUpdate(inventoryItem._id, {
        currentStock: newStock,
        lastUpdatedAt: new Date()
      })

      // Log the deduction to ActivityLog
      await activityLogger.log({
        actionType: 'INVENTORY_AUTO_DEDUCT',
        description: `Auto-deducted ${item.quantity} ${inventoryItem.unit} of ${inventoryItem.name} for order ${order.tokenNumber}. Stock: ${previousStock} → ${newStock}`,
        affectedRecordId: inventoryItem._id,
        metadata: {
          orderId: order._id,
          tokenNumber: order.tokenNumber,
          itemName: inventoryItem.name,
          quantityDeducted: item.quantity,
          previousStock,
          newStock
        }
      })

      // Check threshold and fire alert (only once per item per threshold crossing)
      if (newStock <= inventoryItem.minimumThreshold && previousStock > inventoryItem.minimumThreshold) {
        if (!alertsFired.includes(inventoryItem.name)) {
          alertsFired.push(inventoryItem.name)

          await createNotification({
            recipientRole: 'Admin',
            title: '⚠️ Low Stock Alert',
            message: `${inventoryItem.name} dropped to ${newStock} ${inventoryItem.unit} (threshold: ${inventoryItem.minimumThreshold}). Triggered by order ${order.tokenNumber}.`,
            type: 'inventory',
            urgency: 'High'
          })

          await createNotification({
            recipientRole: 'Staff',
            title: 'Low Stock Alert',
            message: `${inventoryItem.name} is running low — ${newStock} ${inventoryItem.unit} remaining.`,
            type: 'inventory',
            urgency: 'Normal'
          })

          // Emit socket event
          try {
            const { getIO } = require('../socket/socketHandler')
            const io = getIO()
            if (io) {
              io.to('admin').to('staff').emit('inventory_alert', {
                itemName: inventoryItem.name,
                currentStock: newStock,
                minimumThreshold: inventoryItem.minimumThreshold
              })
            }
          } catch (socketErr) {
            console.warn('Socket emit failed for inventory alert:', socketErr.message)
          }

          // Send push notifications to Staff and Admin
          sendPushToRole('Staff', {
            title: 'Low Stock Alert',
            body: `${inventoryItem.name} is low: ${newStock} ${inventoryItem.unit} remaining`,
            url: '/staff'
          }).catch(() => {});

          sendPushToRole('Admin', {
            title: 'Low Stock Alert',
            body: `${inventoryItem.name} is low: ${newStock} ${inventoryItem.unit} remaining`,
            url: '/admin'
          }).catch(() => {});
        }
      }
    }

    console.log(`Inventory deducted for order ${order.tokenNumber}: ${consumption.map(c => `${c.quantity} ${c.name}`).join(', ')}`)
  } catch (error) {
    // CRITICAL: Never let inventory errors affect order completion
    console.error('Inventory deduction failed for order', order.tokenNumber, ':', error.message)
  }
}

module.exports = { deductInventory, calculateConsumption }
