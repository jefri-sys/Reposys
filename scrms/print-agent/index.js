require('dotenv').config();
const { io } = require('socket.io-client');
const printer = require('pdf-to-printer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function getPrintersPowerShell() {
  try {
    const stdout = execSync("Get-Printer | Select-Object Name, @{Name='PrinterStatus';Expression={$_.PrinterStatus.ToString()}}, WorkOffline | ConvertTo-Json", { shell: 'powershell.exe', encoding: 'utf8' });
    if (!stdout.trim()) return [];
    const parsed = JSON.parse(stdout);
    const printers = Array.isArray(parsed) ? parsed : [parsed];
    return printers.map(p => ({
      name: p.Name,
      printerStatus: p.PrinterStatus,
      workOffline: p.WorkOffline === true || p.WorkOffline === 'True',
      isDefault: false,
    }));
  } catch (err) {
    console.error('[Print Agent] Failed to get printers via PowerShell:', err.message);
    return [];
  }
}

const BACKEND_URL = process.env.BACKEND_URL;
const AGENT_SECRET = process.env.AGENT_SECRET;
const AGENT_ID = process.env.AGENT_ID || 'AGENT_01';
const PRINTER_NAME = process.env.PRINTER_NAME;

if (!BACKEND_URL || !AGENT_SECRET || !PRINTER_NAME) {
  console.error('Missing required environment variables. Check .env file.');
  process.exit(1);
}

let heartbeatInterval = null;

const socket = io(BACKEND_URL, {
  auth: { agentSecret: AGENT_SECRET },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 3000,
});

socket.on('connect', () => {
  console.log('[Print Agent] Connected to Reposys backend');
  socket.emit('register_print_agent', {
    agentId: AGENT_ID,
    printerName: PRINTER_NAME,
    agentSecret: AGENT_SECRET,
  });
});

socket.on('agent_registered', async (data) => {
  console.log('[Print Agent] Registered successfully:', data.agentId);

  // Discover installed printers and report them
  try {
    const installedPrinters = getPrintersPowerShell();
    socket.emit('agent_printers', {
      agentId: AGENT_ID,
      printers: installedPrinters.map(p => ({
        windowsPrinterName: p.name,
        isDefault: p.isDefault || false,
      })),
    });
    console.log(`[Print Agent] Reported ${installedPrinters.length} printers`);
  } catch (err) {
    console.error('[Print Agent] Printer discovery failed:', err.message);
    socket.emit('agent_printers', { agentId: AGENT_ID, printers: [] });
  }

  // Start heartbeat every 30 seconds
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  console.log("[Print Agent] Starting heartbeat scheduler...");
  heartbeatInterval = setInterval(() => {
    try {
      const currentPrinters = getPrintersPowerShell();
      console.log(`[Heartbeat] Tick: Sending ${currentPrinters.length} printers status.`);
      socket.emit('agent_heartbeat', {
        agentId: AGENT_ID,
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
    // Download all documents sequentially
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

    // Report printing started
    socket.emit('print_status', {
      printJobId: job.printJobId,
      status: 'Printing',
    });

    // Print each document
    const targetPrinter = job.printerName || PRINTER_NAME;

    for (let i = 0; i < tempFiles.length; i++) {
      console.log(`[Print Agent] Printing document ${i + 1}/${tempFiles.length} to ${targetPrinter}`);
      
      const printOptions = {
        printer: targetPrinter,
        copies: job.copies || 1,
        paperSize: job.paperSize || 'A4',
        monochrome: job.colorMode === 'BlackAndWhite',
        side: job.sided === 'Double' ? 'duplex' : 'simplex',
      };

      console.log('--- DEBUG START ---');
      console.log('job.colorMode:', job.colorMode);
      console.log('job.sided:', job.sided);
      console.log('printOptions:', printOptions);
      console.log('--- DEBUG END ---');

      await printer.print(tempFiles[i], printOptions);
    }

    // Cleanup temp files
    for (const f of tempFiles) {
      try { fs.unlinkSync(f); } catch (_) {}
    }

    // Report completed
    socket.emit('print_status', {
      printJobId: job.printJobId,
      status: 'Completed',
    });

    console.log('[Print Agent] Print job completed:', job.printJobId);

  } catch (error) {
    console.error('[Print Agent] Print job failed:', error.message);

    // Cleanup any downloaded files
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

socket.on('print_agent_unavailable', (data) => {
  console.warn('[Print Agent] Agent availability issue:', data.message);
});

socket.on('disconnect', (reason) => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  console.log('[Print Agent] Disconnected:', reason, '— will reconnect automatically');
});

socket.on('connect_error', (err) => {
  console.error('[Print Agent] Connection error:', err.message, '— retrying...');
});

console.log(`[Print Agent] Starting... connecting to ${BACKEND_URL}`);
