const { io } = require('socket.io-client');
const printer = require('pdf-to-printer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getPrintersPowerShell } = require('./printerService');

let socket = null;
let heartbeatInterval = null;

// To store diagnostic state
const diagnostics = {
  backendReachable: false,
  socketConnected: false,
  printerDetected: false,
  sumatraPdfFound: false,
  heartbeatActive: false,
  lastPrintAt: null,
  agentVersion: require('../package.json').version
};

const { app } = require('electron');

function getSumatraPDFPath() {
  let basePath = (app && app.isPackaged)
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'pdf-to-printer', 'dist')
    : path.join(__dirname, '..', 'node_modules', 'pdf-to-printer', 'dist');
    
  let exactPath = path.join(basePath, 'SumatraPDF-3.4.6-32.exe');
  if (fs.existsSync(exactPath)) return exactPath;
  let userPath = path.join(basePath, 'SumatraPDF.exe');
  if (fs.existsSync(userPath)) return userPath;
  try {
    const files = fs.readdirSync(basePath);
    const exe = files.find(f => f.toLowerCase().startsWith('sumatrapdf') && f.toLowerCase().endsWith('.exe'));
    if (exe) return path.join(basePath, exe);
  } catch(e) {}
  return userPath;
}

const sumatraPath = getSumatraPDFPath();
diagnostics.sumatraPdfFound = fs.existsSync(sumatraPath);

if (printer.default && printer.default.options) {
  printer.default.options.sumatraPdfPath = sumatraPath;
}

module.exports = function startAgent(config, onDeregistered) {
  const { backendUrl, agentId, agentSecret, defaultPrinter } = config;

  if (!backendUrl || !agentId || !agentSecret) {
    console.error('[Print Agent] Missing required config variables');
    return;
  }

  // Check backend reachability periodically
  setInterval(async () => {
    try {
      await axios.get(backendUrl);
      diagnostics.backendReachable = true;
    } catch (e) {
      // It might be reachable even if GET / returns 404, but we assume it responds or at least connects.
      if (e.response) {
        diagnostics.backendReachable = true;
      } else {
        diagnostics.backendReachable = false;
      }
    }
  }, 10000);
  
  const currentPrinters = getPrintersPowerShell();
  diagnostics.printerDetected = currentPrinters.length > 0;

  socket = io(backendUrl, {
    auth: { agentSecret },
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 60000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.log('[Print Agent] Connected to Reposys backend');
    diagnostics.socketConnected = true;
    socket.emit('register_print_agent', {
      agentId,
      printerName: defaultPrinter,
      agentSecret,
    });
  });

  socket.on('agent_registered', async (data) => {
    console.log('[Print Agent] Registered successfully:', data.agentId);

    try {
      const installedPrinters = getPrintersPowerShell();
      socket.emit('agent_printers', {
        agentId,
        printers: installedPrinters.map(p => ({
          windowsPrinterName: p.name,
          isDefault: p.isDefault || false,
        })),
      });
      console.log(`[Print Agent] Reported ${installedPrinters.length} printers`);
    } catch (err) {
      console.error('[Print Agent] Printer discovery failed:', err.message);
      socket.emit('agent_printers', { agentId, printers: [] });
    }

    if (heartbeatInterval) clearInterval(heartbeatInterval);
    console.log("[Print Agent] Starting heartbeat scheduler...");
    diagnostics.heartbeatActive = true;
    heartbeatInterval = setInterval(() => {
      try {
        const currentPrinters = getPrintersPowerShell();
        socket.emit('agent_heartbeat', {
          agentId,
          timestamp: new Date().toISOString(),
          printers: currentPrinters,
        });
      } catch (err) {
        console.warn('[Print Agent] Heartbeat error:', err.message);
      }
    }, 30000);
  });

  socket.on('print_job', async (job) => {
    console.log('[Print Agent] Received print job:', job.printJobId);
    const tempFiles = [];

    try {
      for (let i = 0; i < job.documents.length; i++) {
        const doc = job.documents[i];
        console.log(`[Print Agent] Downloading document ${i + 1}/${job.documents.length}: ${doc.originalFilename}`);

        const response = await axios.get(doc.signedUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        const tempPath = path.join(
          os.tmpdir(),
          `reposys-${job.printJobId}-doc${i}.pdf`
        );
        fs.writeFileSync(tempPath, response.data);
        tempFiles.push(tempPath);
      }

      socket.emit('print_status', {
        printJobId: job.printJobId,
        status: 'Printing',
      });

      const targetPrinter = job.printerName || defaultPrinter;

      for (let i = 0; i < tempFiles.length; i++) {
        console.log(`[Print Agent] Printing document ${i + 1}/${tempFiles.length} to ${targetPrinter}`);
        
        const printOptions = {
          printer: targetPrinter,
          copies: job.copies || 1,
          paperSize: job.paperSize || 'A4',
          monochrome: job.colorMode === 'BlackAndWhite',
          side: job.sided === 'Double' ? 'duplex' : 'simplex',
        };

        await printer.print(tempFiles[i], printOptions);
        diagnostics.lastPrintAt = new Date().toISOString();
      }

      for (const f of tempFiles) {
        try { fs.unlinkSync(f); } catch (_) {}
      }

      socket.emit('print_status', {
        printJobId: job.printJobId,
        status: 'Completed',
      });

      console.log('[Print Agent] Print job completed:', job.printJobId);

    } catch (error) {
      console.error('[Print Agent] Print job failed:', error.message);

      for (const f of tempFiles) {
        try { fs.unlinkSync(f); } catch (_) {}
      }

      socket.emit('print_status', {
        printJobId: job.printJobId,
        status: 'Failed',
        error: error.message,
      });
    }
  });

  socket.on('ping_agent', () => socket.emit('pong_agent', { agentId }));

  socket.on('force_disconnect', () => {
    console.log('Agent deregistered by admin. Shutting down.');
    if (typeof onDeregistered === 'function') onDeregistered();
  });

  socket.on('print_agent_unavailable', (data) => {
    console.warn('[Print Agent] Agent availability issue:', data.message);
  });

  socket.on('disconnect', (reason) => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    diagnostics.heartbeatActive = false;
    diagnostics.socketConnected = false;
    console.log('[Print Agent] Disconnected:', reason, '— will reconnect automatically');
  });

  socket.on('connect_error', (err) => {
    diagnostics.socketConnected = false;
    console.error('[Print Agent] Connection error:', err.message, '— retrying...');
  });

  console.log(`[Print Agent] Starting... connecting to ${backendUrl}`);
};

module.exports.getDiagnostics = function() {
  return diagnostics;
}
