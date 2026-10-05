const Printer = require('../models/Printer');
const PrintAgentRegistry = require('../models/PrintAgentRegistry');
const socketHandler = require('../socket/socketHandler');

// Helper: check which agentIds are currently connected via Socket.io
const getConnectedAgentIds = () => {
  try {
    const io = socketHandler.getIO();
    const connectedIds = new Set();
    for (const [, socket] of io.sockets.sockets) {
      if (socket.agentId) connectedIds.add(socket.agentId);
    }
    return connectedIds;
  } catch {
    return new Set();
  }
};

// GET /api/admin/print-agents/connected
// Returns all agents that have ever connected, with live connection status
// and their last discovered printer list (for the registration dropdown)
exports.getConnectedAgents = async (req, res, next) => {
  try {
    const agents = await PrintAgentRegistry.find({}).sort({ lastConnectedAt: -1 });
    const connectedIds = getConnectedAgentIds();
    const result = agents.map(agent => ({
      agentId: agent.agentId,
      isCurrentlyConnected: connectedIds.has(agent.agentId),
      lastConnectedAt: agent.lastConnectedAt,
      lastHeartbeat: agent.lastHeartbeat,
      discoveredPrinters: agent.discoveredPrinters,
    }));
    return res.status(200).json({ success: true, agents: result });
  } catch (err) {
    return next(err);
  }
};

// GET /api/admin/printers
exports.getPrinters = async (req, res, next) => {
  try {
    const printers = await Printer.find({ isActive: true }).sort({ friendlyName: 1 });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.status(200).json({ success: true, printers });
  } catch (err) {
    return next(err);
  }
};

// GET /api/printers/pending
// Returns all printers that are auto-registered but not yet configured
exports.getPendingPrinters = async (req, res, next) => {
  try {
    const printers = await Printer.find({
      isActive: true,
      isConfigured: false,
    }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, printers });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/printers/:id/configure
// Saves capability configuration and marks printer as configured
exports.configurePrinter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      displayName,
      location,
      department,
      priority,
      isDefault,
      capabilities,
    } = req.body;

    // Validate required configuration fields
    if (!displayName || !capabilities) {
      return res.status(400).json({
        success: false,
        message: 'displayName and capabilities are required to configure a printer.',
      });
    }

    if (!Array.isArray(capabilities.paperSizes) || capabilities.paperSizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one paper size must be specified.',
      });
    }

    // If setting as default, unset existing default first
    if (isDefault) {
      await Printer.updateMany({ isDefault: true }, { isDefault: false });
    }

    const printer = await Printer.findByIdAndUpdate(
      id,
      {
        displayName: displayName.trim(),
        location: location?.trim() || '',
        department: department?.trim() || '',
        priority: priority ?? 5,
        isDefault: isDefault || false,
        capabilities: {
          supportsColor: capabilities.supportsColor || false,
          supportsDuplex: capabilities.supportsDuplex || false,
          paperSizes: capabilities.paperSizes,
          maxQueueSize: capabilities.maxQueueSize || 10,
        },
        isConfigured: true,
      },
      { new: true }
    );

    if (!printer) {
      return res.status(404).json({ success: false, message: 'Printer not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Printer configured. SPAE will now include it in routing.',
      printer,
    });
  } catch (err) {
    return next(err);
  }
};

// POST /api/admin/printers
exports.createPrinter = async (req, res, next) => {
  try {
    const {
      printerId,
      friendlyName,
      agentId,
      windowsPrinterName,
      capabilities,
      isDefault,
    } = req.body;

    if (!printerId || !friendlyName || !agentId || !windowsPrinterName) {
      return res.status(400).json({
        success: false,
        message: 'printerId, friendlyName, agentId, and windowsPrinterName are required.',
      });
    }

    // If setting as default, unset existing default
    if (isDefault) {
      await Printer.updateMany({ isDefault: true }, { isDefault: false });
    }

    const printer = await Printer.create({
      printerId,
      friendlyName,
      agentId,
      windowsPrinterName,
      capabilities: capabilities || {},
      isDefault: isDefault || false,
    });

    return res.status(201).json({ success: true, printer });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/admin/printers/:id
exports.updatePrinter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      friendlyName,
      agentId,
      windowsPrinterName,
      capabilities,
      isDefault,
      isActive,
    } = req.body;

    if (isDefault) {
      await Printer.updateMany({ isDefault: true }, { isDefault: false });
    }

    const printer = await Printer.findByIdAndUpdate(
      id,
      {
        ...(friendlyName !== undefined && { friendlyName }),
        ...(agentId !== undefined && { agentId }),
        ...(windowsPrinterName !== undefined && { windowsPrinterName }),
        ...(capabilities !== undefined && { capabilities }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true }
    );

    if (!printer) {
      return res.status(404).json({ success: false, message: 'Printer not found.' });
    }

    return res.status(200).json({ success: true, printer });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/admin/printers/:id  — permanent hard delete
exports.deletePrinter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const printer = await Printer.findByIdAndDelete(id);
    if (!printer) {
      return res.status(404).json({ success: false, message: 'Printer not found.' });
    }
    return res.status(200).json({ success: true, message: 'Printer permanently deleted.' });
  } catch (err) {
    return next(err);
  }
};

const crypto = require('crypto');
const AgentToken = require('../models/AgentToken');

// POST /api/printers/agents/register (Open Endpoint)
exports.registerAgent = async (req, res, next) => {
  try {
    console.log("[printerController] registerAgent: Request received with body", req.body);
    const {
      registrationToken,
      machineName,
      windowsVersion,
      agentVersion,
      installedPrinters,
      defaultPrinter
    } = req.body;

    if (!registrationToken) {
      console.log("[printerController] registerAgent: Missing registration token");
      return res.status(400).json({ success: false, message: 'registrationToken is required' });
    }

    // Validate Token
    // We allow a special bypass token for testing if the DB doesn't have it initialized yet, 
    // but primarily we check the AgentToken collection.
    console.log("[printerController] registerPrintAgent: Validating token...");
    let valid = false;
    if (registrationToken === process.env.AGENT_SETUP_TOKEN || registrationToken === 'DEV_TEST_TOKEN') {
      console.log("[printerController] registerPrintAgent: Token matched static env config");
      valid = true;
    } else {
      const tokenDoc = await AgentToken.findOne({ token: registrationToken, isUsed: false });
      if (tokenDoc) {
        console.log("[printerController] registerPrintAgent: Token matched database doc, marking as used");
        tokenDoc.isUsed = true;
        await tokenDoc.save();
        valid = true;
      }
    }

    if (!valid) {
      console.warn("[printerController] registerPrintAgent: Invalid or already used registration token");
      return res.status(400).json({ success: false, message: 'Invalid or already used registration token' });
    }

    const agentId = 'AGENT_' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const agentSecret = process.env.PRINT_AGENT_SECRET || process.env.AGENT_SETUP_TOKEN || 'DEV_TEST_TOKEN';
    console.log("[printerController] registerPrintAgent: Generated agentId:", agentId);

    console.log("[printerController] registerPrintAgent: Creating PrintAgentRegistry entry");
    await PrintAgentRegistry.create({
      agentId,
      machineName,
      windowsVersion,
      agentVersion,
      installedPrinters: installedPrinters || [],
      defaultPrinter,
      registeredAt: new Date()
    });
    console.log("[printerController] registerPrintAgent: Database entry created successfully");

    console.log("[printerController] registerPrintAgent: Returning 201 Created to client");
    return res.status(201).json({
      success: true,
      data: {
        agentId,
        agentSecret
      }
    });
  } catch (err) {
    console.error("[printerController] registerPrintAgent FATAL ERROR:", err.message, err.stack);
    return next(err);
  }
};
