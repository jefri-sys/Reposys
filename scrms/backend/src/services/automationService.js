const PrintJob = require('../models/PrintJob');
const AutomationLog = require('../models/AutomationLog');
const SystemConfig = require('../models/SystemConfig');
const Order = require('../models/Order');
const { createNotification } = require('./notificationService');
const socketHandler = require('../socket/socketHandler');
const { getSignedUrl } = require('../config/cloudinary');

const writeLog = async ({ orderId, printJobId = null, event, action, result, metadata = {} }) => {
  try {
    await AutomationLog.create({
      orderId,
      printJobId,
      event,
      action,
      result,
      metadata
    });
  } catch (err) {
    console.error('[AutomationService] writeLog failed:', err.message);
  }
};

async function assignPrinter(order) {
  const Printer = require('../models/Printer');
  const socketHandler = require('../socket/socketHandler');

  // Build capability requirements from the order
  const needsColor = order.printConfig?.colourMode === 'Colour';
  const paperSize = order.printConfig?.paperSize || 'A4';

  // Get all active, online printers that meet requirements
  const capabilityFilter = {
    isActive: true,
    isOnline: true,
    isConfigured: true,
    'capabilities.paperSizes': paperSize,
  };
  if (needsColor) {
    capabilityFilter['capabilities.supportsColor'] = true;
  }

  const candidates = await Printer.find(capabilityFilter).sort({ queueLength: 1 });

  if (candidates.length === 0) {
    // No capable printer available — fall through to manual mode
    return null;
  }

  // Verify at least one candidate's agent is actually connected using robust DB check
  const PrintAgentRegistry = require('../models/PrintAgentRegistry');
  const activeAgents = await PrintAgentRegistry.find({
    $or: [
      { isOnline: true },
      { lastHeartbeat: { $gte: new Date(Date.now() - 120000) } }
    ]
  }).select('agentId');

  const activeAgentIds = new Set(activeAgents.map(a => a.agentId));

  const selectedPrinter = candidates.find(p => activeAgentIds.has(p.agentId));

  if (!selectedPrinter) {
    return null; // Agents disconnected — fall to manual
  }

  return {
    printerId: selectedPrinter.printerId,
    printerName: selectedPrinter.friendlyName,
    windowsPrinterName: selectedPrinter.windowsPrinterName,
    agentId: selectedPrinter.agentId,
  };
}

const createPrintJobForOrder = async (order, systemConfig) => {
  try {
    const count = await PrintJob.countDocuments({ status: { $in: ['Pending', 'Assigned', 'Printing'] } });
    
    if (count >= systemConfig.spae.maxQueueSize) {
      await writeLog({
        orderId: order._id,
        event: 'PAYMENT_VERIFIED',
        action: 'Queue at capacity — order queued manually',
        result: 'QueueFull'
      });
      await createNotification({
        recipientRole: 'Admin',
        recipientType: 'Admin',
        type: 'system',
        urgency: 'Urgent',
        title: 'SPAE Queue Full',
        message: `Print queue has reached max capacity (${systemConfig.spae.maxQueueSize}). Order ${order.tokenNumber} must be processed manually.`
      });
      return { success: false, reason: 'QueueFull' };
    }

    const queuePosition = count + 1;
    const assigned = await assignPrinter(order);
    
    const populatedOrder = await Order.findById(order._id).populate('documentIds');

    const job = new PrintJob({
      orderId: order._id,
      printerId: assigned?.printerId || 'MANUAL',
      printerName: assigned?.printerName || 'Manual Printing',
      agentId: assigned?.agentId || null,
      windowsPrinterName: assigned?.windowsPrinterName || null,
      queuePosition,
      status: assigned ? 'Assigned' : 'Manual Required',
      copies: order.printConfig?.copies || 1,
      colorMode: order.printConfig?.colourMode || 'BlackAndWhite',
      sided: order.printConfig?.sided || 'Single',
      paperSize: order.printConfig?.paperSize || 'A4',
      binding: order.printConfig?.binding || 'None',
      pageCount: order.pageCount || 0,
      documents: (populatedOrder.documentIds || []).map(doc => ({
        documentId: doc._id,
        cloudinaryPublicId: doc.publicId,
        originalFilename: doc.originalFilename || '',
      })),
      serviceType: order.serviceType,
      estimatedDuration: order.estimatedDuration || 0,
      assignedAt: new Date()
    });
    await job.save();

    if (!assigned) {
      // Manual fallback — log and notify staff
      await AutomationLog.create({
        orderId: order._id,
        event: 'MANUAL_FALLBACK',
        action: 'No suitable online printer found. Manual printing required.',
        result: 'Failed',
      });
      // Notify staff
      await createNotification({
        recipientRole: 'Staff',
        recipientType: 'Staff',
        title: 'Manual Print Required',
        message: `No printer available for order ${order.tokenNumber || order._id}. Print manually.`,
        type: 'order_update',
        urgency: 'Urgent',
      });
    }

    await writeLog({
      orderId: order._id,
      printJobId: job._id,
      event: 'PAYMENT_VERIFIED',
      action: `PrintJob created and assigned to ${job.printerName} at queue position ${queuePosition}`,
      result: 'Success',
      metadata: { printerId: job.printerId, printerName: job.printerName, queuePosition, printJobId: job._id }
    });

    try {
      const io = socketHandler.getIO();
      io.to('staff').emit('spae_job_created', {
        orderId: order._id,
        tokenNumber: order.tokenNumber,
        printJobId: job._id,
        printerName: job.printerName,
        queuePosition
      });
    } catch (socketErr) {
      console.warn('[AutomationService] Socket emit failed:', socketErr.message);
    }

    if (order.userId) {
      await createNotification({
        recipientId: order.userId,
        recipientType: 'User',
        type: 'order_update',
        urgency: 'Normal',
        title: 'Print Job Queued',
        message: `Your order ${order.tokenNumber} has been queued for printing. Position: ${queuePosition}.`
      });
    }

    return { success: true, job };
  } catch (err) {
    throw err;
  }
};

exports.handlePaymentVerified = async (payload) => {
  const { orderId, order } = payload;
  try {
    const systemConfig = await SystemConfig.getInstance();
    
    if (!systemConfig.spae?.enabled) return;

    if (order.paymentMethod === 'Cash' && order.paymentStatus !== 'Cash_Collected') {
      await writeLog({
        orderId: order._id,
        event: 'PAYMENT_VERIFIED',
        action: 'Cash order created — awaiting physical cash collection by staff before print job is created',
        result: 'AwaitingCash'
      });
      return;
    }

    await createPrintJobForOrder(order, systemConfig);
  } catch (err) {
    console.error('[AutomationService] handlePaymentVerified error:', err.message);
    await writeLog({ orderId: payload?.orderId, event: 'PAYMENT_VERIFIED', action: 'Unexpected error in automation', result: 'Failed', metadata: { error: err.message } }).catch(() => {});
  }
};

exports.handleCashConfirmed = async (payload) => {
  try {
    const freshOrder = await Order.findById(payload.orderId).lean();
    if (!freshOrder) {
      console.warn('[AutomationService] handleCashConfirmed: order not found', payload.orderId);
      return;
    }
    if (freshOrder.paymentStatus !== 'Cash_Collected') {
      console.warn('[AutomationService] handleCashConfirmed: paymentStatus is not Cash_Collected', freshOrder.paymentStatus);
      return;
    }

    const systemConfig = await SystemConfig.getInstance();
    if (!systemConfig.spae?.enabled) return;

    await createPrintJobForOrder(freshOrder, systemConfig);
  } catch (err) {
    console.error('[AutomationService] handleCashConfirmed error:', err.message);
    await writeLog({ orderId: payload?.orderId, event: 'CASH_CONFIRMED', action: 'Unexpected error in automation', result: 'Failed', metadata: { error: err.message } }).catch(() => {});
  }
};

exports.handleOrderCancelled = async (payload) => {
  try {
    const printJob = await PrintJob.findOne({ 
      orderId: payload.orderId, 
      status: { $in: ['Pending', 'Queued', 'Assigned', 'Dispatching', 'Printing'] } 
    });

    if (!printJob) return;

    if (printJob.status === 'Printing') {
      await writeLog({
        orderId: payload.orderId,
        printJobId: printJob._id,
        event: 'ORDER_CANCELLED',
        action: 'Order cancelled but print job already printing — staff must handle physically',
        result: 'Skipped'
      });
      return;
    }

    printJob.status = 'Cancelled';
    await printJob.save();

    await writeLog({
      orderId: payload.orderId,
      printJobId: printJob._id,
      event: 'ORDER_CANCELLED',
      action: 'PrintJob automatically cancelled when order was cancelled',
      result: 'Success'
    });
  } catch (err) {
    console.error('[AutomationService] handleOrderCancelled error:', err.message);
  }
};

async function dispatchPrintJob(printJob) {
  const io = socketHandler.getIO();
  const PrintAgentRegistry = require('../models/PrintAgentRegistry');
  const targetAgentId = printJob.agentId;

  // ── Tier 1: Find socket directly by agentId ──────────────────────────────
  let targetSocket = null;
  for (const [, socket] of io.sockets.sockets) {
    if (socket.agentId === targetAgentId) {
      targetSocket = socket;
      break;
    }
  }

  // If socket found but not in room, re-add it now so emit works
  if (targetSocket) {
    targetSocket.join('print_agents');
  }

  // ── Tier 2: DB heartbeat fallback ────────────────────────────────────────
  // Even if socket tracking failed, the agent may still be connected and
  // listening. Check DB lastHeartbeat as ground truth.
  if (!targetSocket && targetAgentId) {
    const agentRecord = await PrintAgentRegistry.findOne({ agentId: targetAgentId }).lean();
    if (agentRecord) {
      const lastHbMs = agentRecord.lastHeartbeat ? new Date(agentRecord.lastHeartbeat).getTime() : 0;
      if ((Date.now() - lastHbMs) < 120000) {
        // Agent is alive — try to find any socket that may be this agent
        // (even without agentId attached) and add it to the room
        for (const [, socket] of io.sockets.sockets) {
          if (!socket.agentId) {
            // Tentatively add untagged sockets to the room so the broadcast reaches them
            socket.join('print_agents');
          }
        }
      }
    }
  }

  // ── Tier 3: Check room membership (original check) ───────────────────────
  const agentRoom = io.sockets.adapter.rooms.get('print_agents');
  const isAgentReachable = (agentRoom && agentRoom.size > 0);

  if (!isAgentReachable) {
    await AutomationLog.create({
      orderId: printJob.orderId,
      printJobId: printJob._id,
      event: 'DISPATCH_FAILED',
      action: 'No print agent connected. Job remains Pending.',
      result: 'Failed',
    });
    io.to('staff').emit('print_agent_unavailable', {
      printJobId: printJob._id,
      orderId: printJob.orderId,
      message: 'No Print Agent connected. Print manually.',
    });
    return;
  }

  const signedDocuments = await Promise.all(
    (printJob.documents || []).map(async (doc) => {
      const signedUrl = await getSignedUrl(doc.cloudinaryPublicId);
      return {
        documentId: doc.documentId.toString(),
        signedUrl,
        originalFilename: doc.originalFilename,
      };
    })
  );

  printJob.status = 'Dispatched';
  printJob.dispatchedAt = new Date();
  await printJob.save();

  io.to('print_agents').emit('print_job', {
    printJobId: printJob._id.toString(),
    orderId: printJob.orderId.toString(),
    documents: signedDocuments,
    copies: printJob.copies,
    paperSize: printJob.paperSize,
    colorMode: printJob.colorMode,
    sided: printJob.sided,
    printerName: printJob.windowsPrinterName || printJob.printerName || null,
  });

  await AutomationLog.create({
    orderId: printJob.orderId,
    printJobId: printJob._id,
    event: 'JOB_DISPATCHED',
    action: `PrintJob dispatched to print_agents room. Documents: ${signedDocuments.length}`,
    result: 'Success',
  });
}

exports.dispatchPrintJob = dispatchPrintJob;
exports.createPrintJobForOrder = createPrintJobForOrder;
exports.assignPrinter = assignPrinter;
