const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const ActivityLog = require('../models/ActivityLog');

router.use(verifyToken);
router.use(roleGuard('Staff', 'Admin'));

// GET /api/admin/print-agent/info
router.get('/info', async (req, res) => {
  const url = process.env.PRINT_AGENT_INSTALLER_URL;
  return res.status(200).json({
    available: Boolean(url),
    version: process.env.PRINT_AGENT_VERSION || 'Unknown',
    notes: 'Initial release - Phase 4',
  });
});

// GET /api/admin/print-agent/download
router.get('/download', async (req, res, next) => {
  const url = process.env.PRINT_AGENT_INSTALLER_URL;

  if (!url) {
    return res.status(503).json({
      success: false,
      message: 'Installer not currently available. Contact system administrator.',
    });
  }

  // Log download (fire-and-forget, don't block the redirect)
  ActivityLog.create({
    actionType: 'PRINT_AGENT_DOWNLOAD',
    performedBy: req.user.id,
    description: `Print Agent installer downloaded by ${req.user.email}`,
  }).catch(err => console.error('Failed to log print agent download:', err));

  return res.redirect(302, url);
});

// ---------------------------------------------------------
// ADMIN ONLY ROUTES
// ---------------------------------------------------------
const PrintAgentRegistry = require('../models/PrintAgentRegistry');
const socketHandler = require('../socket/socketHandler');

router.get('/agents', roleGuard('Admin'), async (req, res, next) => {
  try {
    // Return all agents, including deregistered ones, so admin can manage/delete them
    const agents = await PrintAgentRegistry.find({})
      .sort({ registeredAt: -1, lastConnectedAt: -1 })
      .lean();
    
    // Check which are live via socket map OR recent heartbeat (120s window)
    const connectedIds = new Set();
    try {
      const io = socketHandler.getIO();
      for (const [, socket] of io.sockets.sockets) {
        if (socket.agentId) connectedIds.add(socket.agentId);
      }
    } catch(e) {}

    const now = Date.now();
    const result = agents.map(agent => {
      const lastHeartbeatMs = agent.lastHeartbeat ? new Date(agent.lastHeartbeat).getTime() : 0;
      const isRecentlySeen = (now - lastHeartbeatMs) < 120000;
      return {
        _id: agent._id,
        agentId: agent.agentId,
        machineName: agent.machineName,
        windowsVersion: agent.windowsVersion,
        agentVersion: agent.agentVersion,
        location: agent.location,
        printerCount: (agent.discoveredPrinters || agent.installedPrinters || []).length,
        printers: agent.discoveredPrinters || agent.installedPrinters || [],
        isAgentConnected: connectedIds.has(agent.agentId) || isRecentlySeen,
        isDeregistered: agent.isDeregistered === true,
        lastSeenAt: agent.lastHeartbeat || agent.lastConnectedAt || agent.registeredAt,
        addedAt: agent.registeredAt,
      };
    });
    
    // Sort by lastSeenAt desc explicitly
    result.sort((a, b) => {
      const timeA = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const timeB = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return timeB - timeA;
    });

    res.status(200).json({ success: true, agents: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/agents/:agentId', roleGuard('Admin'), async (req, res, next) => {
  try {
    const { agentId } = req.params;
    
    await PrintAgentRegistry.findOneAndUpdate(
      { agentId },
      { $set: { isDeregistered: true } }
    );
    
    try {
      const io = socketHandler.getIO();
      io.to(`agent:${agentId}`).emit('force_disconnect');
    } catch(e) {}

    ActivityLog.create({
      actionType: 'AGENT_DEREGISTERED',
      performedBy: req.user.id,
      description: `Print Agent ${agentId} deregistered by ${req.user.email}`,
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Agent deregistered' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/print-agent/agents/:agentId/hard-delete — permanently remove
router.delete('/agents/:agentId/hard-delete', roleGuard('Admin'), async (req, res, next) => {
  try {
    const { agentId } = req.params;

    const agent = await PrintAgentRegistry.findOne({ agentId });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found.' });
    }

    // Forcibly disconnect if online
    try {
      const io = socketHandler.getIO();
      io.to(`agent:${agentId}`).emit('force_disconnect');
    } catch(e) {}

    await PrintAgentRegistry.deleteOne({ agentId });

    ActivityLog.create({
      actionType: 'PRINT_AGENT_DELETED',
      performedBy: req.user.id,
      description: `Print Agent ${agentId} permanently deleted by ${req.user.email}`,
    }).catch(() => {});

    res.status(200).json({ success: true, message: `Agent ${agentId} permanently deleted.` });
  } catch (err) {
    next(err);
  }
});

router.post('/agents/:agentId/ping', roleGuard('Admin'), async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const io = socketHandler.getIO();
    const start = Date.now();

    // Try to find the socket by agentId (direct connection check)
    let targetSocket = null;
    for (const [, socket] of io.sockets.sockets) {
      if (socket.agentId === agentId) {
        targetSocket = socket;
        break;
      }
    }

    if (targetSocket) {
      // Agent is directly connected — send a real socket ping
      try {
        io.to(`agent:${agentId}`).emit('ping_agent');
        const latencyMs = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('timeout')), 5000);
          targetSocket.once('pong_agent', (data) => {
            if (data.agentId === agentId) {
              clearTimeout(timer);
              resolve(Date.now() - start);
            }
          });
        });
        return res.status(200).json({ responsive: true, latencyMs });
      } catch(e) {
        return res.status(200).json({ responsive: false, error: 'No response' });
      }
    }

    // Socket not found by agentId — check DB heartbeat as fallback
    const agent = await PrintAgentRegistry.findOne({ agentId }).lean();
    if (agent) {
      const lastHeartbeatMs = agent.lastHeartbeat ? new Date(agent.lastHeartbeat).getTime() : 0;
      const ageSeconds = Math.round((Date.now() - lastHeartbeatMs) / 1000);
      if ((Date.now() - lastHeartbeatMs) < 120000) {
        return res.status(200).json({ responsive: true, latencyMs: ageSeconds * 1000, note: `Last heartbeat ${ageSeconds}s ago` });
      }
    }

    return res.status(200).json({ responsive: false, error: 'Agent not reachable' });
  } catch (err) {
    next(err);
  }
});

router.get('/credentials', roleGuard('Admin'), (req, res) => {
  res.status(200).json({
    backendUrl: process.env.RENDER_EXTERNAL_URL || 'Check Render dashboard'
  });
});

module.exports = router;
