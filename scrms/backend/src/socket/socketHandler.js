const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { getPrimaryFrontendUrl, isOriginAllowed } = require('../config/origins');
const PrintAgentRegistry = require('../models/PrintAgentRegistry');
const Printer = require('../models/Printer');

const QUEUE_ROOMS = [
  'queue:Printing',
  'queue:Photocopying',
  'queue:Scanning',
  'queue:Binding',
  'queue:Conversion',
];

let ioInstance;

const parseTokenFromCookieHeader = (cookieHeader = '') => {
  const tokenCookie = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('token='));

  if (!tokenCookie) {
    return null;
  }

  return decodeURIComponent(tokenCookie.slice('token='.length));
};

const joinStaffQueueRooms = (socket) => {
  socket.join('staff');
  QUEUE_ROOMS.forEach((room) => socket.join(room));
};

const getTokenFromHandshake = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken;
  }

  return parseTokenFromCookieHeader(socket.handshake.headers?.cookie);
};

const init = (server) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket) => {
    socket.on('join_order_room', (orderId) => {
      if (orderId && typeof orderId === 'string') {
        socket.join('public-track:' + orderId);
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // COMPLAINT CHAT — EXISTING EVENTS — DO NOT MODIFY
    // These events handle real-time messaging between users and
    // staff/admin for order complaints.
    // They are completely separate from the friends chat (Phase 12D).
    // Room naming used here: user:{userId}, staff, admin
    // Events in this block: joinUserRoom
    // ═══════════════════════════════════════════════════════════════════
    socket.on('joinUserRoom', (userId) => {
      if (userId && typeof userId === 'string') {
        const roomName = userId.startsWith('user:') ? userId : `user:${userId}`;
        socket.join(roomName);
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // FRIENDS CHAT — NEW EVENTS — Phase 12D
    // All new Socket.io events for one-to-one chat, group chat, and
    // split card updates are added below this line only.
    // Do not add friends chat events above this line.
    // Room naming: userId string for user rooms,
    //              'group_{groupId}' for group rooms
    // ═══════════════════════════════════════════════════════════════════

    socket.on('joinUserRoom', (userId) => {
      if (userId && typeof userId === 'string') {
        socket.join(userId);
      }
    });

    socket.on('typing', ({ recipientId, senderId }) => {
      if (recipientId) {
        socket.to(recipientId).emit('userTyping', { senderId });
      }
    });

    socket.on('stopTyping', ({ recipientId, senderId }) => {
      if (recipientId) {
        socket.to(recipientId).emit('userStopTyping', { senderId });
      }
    });

    socket.on('messagesRead', (payload) => {
      if (payload && payload.userId) {
        socket.to(payload.userId).emit('messagesRead', payload);
      }
    });

    socket.on('joinGroupRoom', (groupId) => {
      if (groupId) {
        socket.join('group_' + groupId);
      }
    });

    socket.on('leaveGroupRoom', (groupId) => {
      if (groupId) {
        socket.leave('group_' + groupId);
      }
    });

    socket.on('splitCardUpdate', (payload) => {
      if (payload && payload.groupId && payload.splitData) {
        socket.to('group_' + payload.groupId).emit('splitCardUpdate', payload.splitData);
      }
    });

  // ■■ SPAE PHASE 2 — PRINT AGENT SOCKET HANDLERS ■■

  socket.on('register_print_agent', async (data) => {
    const expectedSecret = process.env.PRINT_AGENT_SECRET || process.env.AGENT_SETUP_TOKEN || 'DEV_TEST_TOKEN';
    if (!expectedSecret || data.agentSecret !== expectedSecret) {
      console.warn('[socketHandler] Print Agent rejected: invalid secret');
      socket.disconnect();
      return;
    }
    socket.join('print_agents');
    socket.agentId = data.agentId;
    socket.printerName = data.printerName;
    console.log(`[socketHandler] Print Agent registered: ${data.agentId}`);

    // Update PrintAgentRegistry
    try {
      await PrintAgentRegistry.findOneAndUpdate(
        { agentId: data.agentId },
        {
          isOnline: true,
          lastConnectedAt: new Date(),
          lastHeartbeat: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      // Mark all configured printers for this agent as active and online
      await Printer.updateMany(
        { agentId: data.agentId, isConfigured: true },
        { isOnline: true, isActive: true, lastHeartbeat: new Date() }
      );
      // Mark unconfigured printers online but not active (can't receive jobs)
      await Printer.updateMany(
        { agentId: data.agentId, isConfigured: { $ne: true } },
        { isOnline: true, lastHeartbeat: new Date() }
      );
    } catch (err) {
      console.error('[socketHandler] PrintAgentRegistry update failed:', err.message);
    }

    socket.emit('agent_registered', { success: true, agentId: data.agentId });
  });

  socket.on('agent_printers', async (data) => {
    try {
      if (!socket.agentId && data.agentId) {
        socket.agentId = data.agentId;
        socket.join('print_agents');
      }

      const Printer = require('../models/Printer');
      const PrintAgentRegistry = require('../models/PrintAgentRegistry');
      const { createNotification } = require('../services/notificationService');

      const agentId = data.agentId;
      const reportedPrinters = data.printers || [];

      // Update PrintAgentRegistry with discovered list
      await PrintAgentRegistry.findOneAndUpdate(
        { agentId },
        {
          discoveredPrinters: reportedPrinters,
          lastHeartbeat: new Date(),
        },
        { upsert: true, new: true }
      );

      let newPrintersFound = 0;

      for (const reported of reportedPrinters) {
        const windowsPrinterName = reported.windowsPrinterName;
        if (!windowsPrinterName) continue;

        // Check if this printer already exists for this agent
        const existing = await Printer.findOne({ agentId, windowsPrinterName });

        if (existing) {
          // Update online status only — do not overwrite admin configuration
          await Printer.findByIdAndUpdate(existing._id, {
            isOnline: true,
            currentStatus: existing.currentStatus === 'Offline' ? 'Idle' : existing.currentStatus,
            lastHeartbeat: new Date(),
          });
        } else {
          // Auto-register new printer with defaults
          // printerId is generated as AGENT_PRINTERNAME with spaces replaced
          const sanitized = windowsPrinterName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 40);
          const printerId = `${agentId}_${sanitized}`.toUpperCase();

          // Avoid duplicate printerId collisions
          const alreadyExists = await Printer.findOne({ printerId });
          if (alreadyExists) continue;

          await Printer.create({
            printerId,
            friendlyName: windowsPrinterName,
            displayName: windowsPrinterName,
            agentId,
            windowsPrinterName,
            isConfigured: false,
            isDefault: reported.isDefault || false,
            isActive: true,
            isOnline: true,
            currentStatus: 'Idle',
            lastHeartbeat: new Date(),
          });

          newPrintersFound += 1;
          console.log(`[socketHandler] Auto-registered new printer: ${windowsPrinterName} from agent ${agentId}`);
        }
      }

      // Notify admin if new printers were discovered
      if (newPrintersFound > 0) {
        await createNotification({
          recipientRole: 'Admin',
          recipientType: 'Admin',
          title: 'New Printers Discovered',
          message: `${newPrintersFound} new printer(s) auto-registered from Print Agent ${agentId}. Configuration required before use.`,
          type: 'system',
          urgency: 'Normal',
        });

        // Emit to admin socket room so dashboard updates live
        ioInstance.to('admin').emit('printers_updated', {
          agentId,
          newPrintersFound,
        });
      }

      console.log(`[socketHandler] agent_printers: ${agentId} reported ${reportedPrinters.length} printers, ${newPrintersFound} new`);

    } catch (err) {
      console.error('[socketHandler] agent_printers error:', err.message);
    }
  });

  socket.on('agent_heartbeat', async (data) => {
    try {
      if (!socket.agentId && data.agentId) {
        socket.agentId = data.agentId;
        socket.join('print_agents');
      }

      console.log(`[socketHandler] Heartbeat received from ${data.agentId} at ${new Date().toLocaleTimeString()}`);
      const now = new Date();
      await PrintAgentRegistry.findOneAndUpdate(
        { agentId: data.agentId },
        { lastHeartbeat: now, isOnline: true }
      );
      // First mark all printers of this agent as offline (preserving isActive & isConfigured)
      await Printer.updateMany(
        { agentId: data.agentId },
        { isOnline: false }
      );

      // Then update detailed state for the ones reported by the agent
      const printersData = data.printers || [];
      if (printersData.length > 0) {
        const bulkOps = printersData.map(p => ({
          updateOne: {
            filter: { agentId: data.agentId, isActive: true, windowsPrinterName: (p.name || p.windowsPrinterName) },
            update: {
              $set: {
                isOnline: true,
                isActive: true,
                lastHeartbeat: now,
                workOffline: p.workOffline === true || String(p.workOffline).toLowerCase() === 'true',
                printerStatus: p.printerStatus || 'Unknown'
              }
            }
          }
        }));
        await Printer.bulkWrite(bulkOps);
      }

      // Emit real-time update to staff UI so they don't have to wait for the 15s poll
      ioInstance.to('staff').emit('printer_status_updated');
    } catch (err) {
      console.error('[socketHandler] agent_heartbeat error:', err.message);
    }
  });

  socket.on('print_status', async (data) => {
    try {
      const PrintJob = require('../models/PrintJob');
      const AutomationLog = require('../models/AutomationLog');
      const { createNotification } = require('../services/notificationService');

      const printJob = await PrintJob.findById(data.printJobId);
      if (!printJob) {
        console.warn('[socketHandler] print_status: PrintJob not found:', data.printJobId);
        return;
      }

      if (data.status === 'Printing') {
        printJob.status = 'Printing';
        printJob.printingStartedAt = new Date();
        printJob.agentId = socket.agentId || null;
        await printJob.save();

        await AutomationLog.create({
          orderId: printJob.orderId,
          printJobId: printJob._id,
          event: 'PRINTING_STARTED',
          action: `Print Agent ${socket.agentId || 'unknown'} started printing.`,
          result: 'Success',
        });

        ioInstance.to('staff').emit('print_job_update', {
          printJobId: printJob._id,
          orderId: printJob.orderId,
          status: 'Printing',
          agentId: socket.agentId,
        });
      }

      if (data.status === 'Completed') {
        printJob.status = 'Printed';
        printJob.printedAt = new Date();
        await printJob.save();

        await AutomationLog.create({
          orderId: printJob.orderId,
          printJobId: printJob._id,
          event: 'PRINTING_COMPLETED',
          action: 'Print Agent completed printing. Awaiting staff inspection.',
          result: 'Success',
        });

        await createNotification({
          recipientRole: 'Staff',
          recipientType: 'Staff',
          title: 'Print Completed — Inspection Required',
          message: `Printing finished for order ${printJob.orderId}. Inspect and proceed.`,
          type: 'order_update',
        });

        ioInstance.to('staff').emit('print_job_update', {
          printJobId: printJob._id,
          orderId: printJob.orderId,
          status: 'Printed',
        });
      }

      if (data.status === 'Failed') {
        printJob.status = 'Failed';
        printJob.failureReason = data.error || 'Unknown error';
        await printJob.save();

        await AutomationLog.create({
          orderId: printJob.orderId,
          printJobId: printJob._id,
          event: 'PRINTING_FAILED',
          action: `Print failed: ${data.error || 'Unknown error'}`,
          result: 'Failed',
        });

        await createNotification({
          recipientRole: 'Staff',
          recipientType: 'Staff',
          title: 'Print Failed — Manual Intervention Required',
          message: `Print job failed for order ${printJob.orderId}: ${data.error || 'Unknown error'}`,
          type: 'order_update',
          urgency: 'Urgent',
        });

        ioInstance.to('staff').emit('print_job_update', {
          printJobId: printJob._id,
          orderId: printJob.orderId,
          status: 'Failed',
          error: data.error,
        });
      }
    } catch (err) {
      console.error('[socketHandler] print_status error:', err.message);
    }
  });

  socket.on('disconnect', async () => {
    if (socket.agentId) {
      try {
        await PrintAgentRegistry.findOneAndUpdate(
          { agentId: socket.agentId },
          { isOnline: false }
        );
        await Printer.updateMany(
          { agentId: socket.agentId },
          { isOnline: false, currentStatus: 'Offline' }
        );
        console.log(`[socketHandler] Print Agent disconnected: ${socket.agentId}`);
      } catch (err) {
        console.error('[socketHandler] disconnect cleanup error:', err.message);
      }
    }
  });

    const trackOrderId = socket.handshake.query?.trackOrderId;
    if (trackOrderId) {
      socket.join('public-track:' + trackOrderId);
    }

    const token = getTokenFromHandshake(socket);

    if (!token) {
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return;
    }

    socket.userId = decoded.id;
    socket.userRole = decoded.role;

    if (decoded.role === 'Student' || decoded.role === 'Faculty') {
      socket.join(`user:${decoded.id}`);
      return;
    }

    if (decoded.role === 'Staff') {
      joinStaffQueueRooms(socket);
      return;
    }

    if (decoded.role === 'Admin') {
      socket.join('admin');
      joinStaffQueueRooms(socket);
      return;
    }

    if (decoded.role === 'Guest' && decoded.sessionId) {
      socket.join(`guest:${decoded.sessionId}`);
      return;
    }
  });

  return ioInstance;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet.');
  }

  return ioInstance;
};

module.exports = {
  init,
  getIO,
};
