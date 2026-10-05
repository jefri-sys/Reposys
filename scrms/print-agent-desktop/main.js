const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const autoLaunch = require('auto-launch');
const { getPrintersPowerShell } = require('./agent/printerService');
const startAgent = require('./agent/index');
const { getDiagnostics } = require('./agent/index');
const printer = require('pdf-to-printer');
const axios = require('axios');

function getSumatraPDFPath() {
  let basePath;
  if (app.isPackaged) {
    basePath = path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      'pdf-to-printer',
      'dist'
    );
  } else {
    basePath = path.join(
      __dirname,
      'node_modules',
      'pdf-to-printer',
      'dist'
    );
  }
  
  // Try exact name from v5.2.1
  let exactPath = path.join(basePath, 'SumatraPDF-3.4.6-32.exe');
  if (fs.existsSync(exactPath)) return exactPath;
  
  // Try what user provided
  let userPath = path.join(basePath, 'SumatraPDF.exe');
  if (fs.existsSync(userPath)) return userPath;
  
  // Fallback to searching the dir
  try {
    const files = fs.readdirSync(basePath);
    const exe = files.find(f => f.toLowerCase().startsWith('sumatrapdf') && f.toLowerCase().endsWith('.exe'));
    if (exe) return path.join(basePath, exe);
  } catch (e) {}
  
  return userPath;
}

// Log capture
const MAX_LOGS = 50;
const logBuffer = [];
function addLog(...args) {
  const line = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  logBuffer.push(`[${new Date().toISOString()}] ${line}`);
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();
}
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.log = (...args) => { addLog('INFO', ...args); originalConsoleLog(...args); };
console.error = (...args) => { addLog('ERROR', ...args); originalConsoleError(...args); };
console.warn = (...args) => { addLog('WARN', ...args); originalConsoleWarn(...args); };

const BACKEND_URL = process.env.BACKEND_URL || 'https://scrms-ready.onrender.com';

let store;
let tray = null;
let setupWindow = null;
let diagnosticsWindow = null;

const agentAutoLauncher = new autoLaunch({
  name: 'Reposys Print Agent',
  path: app.getPath('exe'),
});

async function initStore() {
  const Store = (await import('electron-store')).default;
  store = new Store({
    schema: {
      agentId: { type: 'string' },
      agentSecret: { type: 'string' },
      defaultPrinter: { type: 'string' },
      registeredAt: { type: 'string' }
    }
  });
}

function createSetupWindow() {
  if (setupWindow) return;
  setupWindow = new BrowserWindow({
    width: 600,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    show: false
  });
  
  setupWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  setupWindow.once('ready-to-show', () => {
    setupWindow.show();
  });
  setupWindow.on('closed', () => {
    setupWindow = null;
  });
}

function createDiagnosticsWindow() {
  if (diagnosticsWindow) {
    diagnosticsWindow.focus();
    return;
  }
  diagnosticsWindow = new BrowserWindow({
    width: 400,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    show: false
  });
  diagnosticsWindow.loadFile(path.join(__dirname, 'renderer', 'diagnostics.html'));
  diagnosticsWindow.once('ready-to-show', () => {
    diagnosticsWindow.show();
  });
  diagnosticsWindow.on('closed', () => {
    diagnosticsWindow = null;
  });
}

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    // Fallback if icon missing
    console.error('Tray icon missing, skipping tray setup for now');
    return;
  }
  
  const updateContextMenu = async () => {
    const isEnabled = await agentAutoLauncher.isEnabled();
    const contextMenu = Menu.buildFromTemplate([
      { label: 'View Status / Setup', click: () => createSetupWindow() },
      { label: 'View Diagnostics', click: () => createDiagnosticsWindow() },
      { label: 'Restart Agent', click: () => {
          app.relaunch();
          app.quit();
        } 
      },
      { 
        label: 'Start with Windows', 
        type: 'checkbox', 
        checked: isEnabled,
        click: async (menuItem) => {
          if (menuItem.checked) {
            await agentAutoLauncher.enable();
          } else {
            await agentAutoLauncher.disable();
          }
        }
      },
      { type: 'separator' },
      { label: 'Quit', click: () => {
          app.isQuitting = true;
          app.quit();
        } 
      }
    ]);
    tray.setToolTip('Reposys Print Agent');
    tray.setContextMenu(contextMenu);
  };
  
  updateContextMenu();
  tray.on('click', () => {
    createSetupWindow();
  });
}

app.whenReady().then(async () => {
  const sumatraPath = getSumatraPDFPath();
  console.log('Resolved SumatraPDF path:', sumatraPath);
  
  if (!fs.existsSync(sumatraPath)) {
    dialog.showErrorBox(
      'Print Agent Setup Error',
      'SumatraPDF.exe not found at expected path.\nPlease reinstall the application.'
    );
    app.quit();
    return;
  }
  
  if (printer.default && printer.default.options) {
    printer.default.options.sumatraPdfPath = sumatraPath;
  } else {
    console.warn('pdf-to-printer configuration override not possible. Relying on asarUnpack.');
  }

  await initStore();
  
  ipcMain.handle('get-printers', () => {
    const printers = getPrintersPowerShell();
    return printers.map(p => p.name);
  });
  
  ipcMain.handle('save-config', (event, config) => {
    try {
      console.log("[main.js] save-config invoked with config:", JSON.stringify(config, null, 2));
      store.set('agentId', config.agentId);
      store.set('agentSecret', config.agentSecret);
      store.set('defaultPrinter', config.defaultPrinter);
      store.set('registeredAt', new Date().toISOString());
      console.log("[main.js] save-config: store updated successfully.");
      
      // Start agent
      console.log("[main.js] save-config: calling runAgent()");
      runAgent();
      
      console.log("[main.js] save-config: returning true to renderer, renderer will transition to step 6");
      return true;
    } catch (e) {
      console.error("[main.js] save-config ERROR:", e.message, e.stack);
      throw e;
    }
  });
  
  ipcMain.handle('get-status', () => {
    const diag = getDiagnostics();
    return {
      connected: diag.socketConnected,
      agentId: store.get('agentId'),
      printerName: store.get('defaultPrinter'),
      backendUrl: BACKEND_URL
    };
  });
  
  ipcMain.handle('get-logs', () => {
    return logBuffer;
  });
  
  ipcMain.handle('test-print', async (event, printerName) => {
    try {
      const originalPdfPath = path.join(__dirname, 'assets', 'test.pdf');
      const tempPdfPath = path.join(os.tmpdir(), 'reposys-test-print.pdf');
      
      // Copy file out of ASAR so the external SumatraPDF binary can read it
      fs.copyFileSync(originalPdfPath, tempPdfPath);
      
      await printer.print(tempPdfPath, { printer: printerName });
      
      try {
        fs.unlinkSync(tempPdfPath);
      } catch (err) {}
      
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  ipcMain.handle('get-diagnostics', () => {
    return getDiagnostics();
  });

  ipcMain.handle('register-agent', async (event, payload) => {
    console.log("[main.js] register-agent invoked with payload:", JSON.stringify(payload, null, 2));
    try {
      const url = `${BACKEND_URL}/api/printers/agents/register`;
      console.log("[main.js] register-agent: Sending POST to", url);
      const response = await axios.post(url, payload);
      console.log("[main.js] register-agent: HTTP response received. Status:", response.status);
      console.log("[main.js] register-agent: Response body:", JSON.stringify(response.data, null, 2));
      
      // Backend returns: { success: true, data: { agentId, agentSecret } }
      // Unwrap the inner data so the renderer gets agentId/agentSecret directly
      const { agentId, agentSecret } = response.data?.data || {};
      console.log("[main.js] register-agent: unwrapped agentId and agentSecret:", { agentId, agentSecret });
      
      if (!agentId || !agentSecret) {
        console.error("[main.js] register-agent: Server returned an invalid response. Missing agentId or agentSecret.");
        return { success: false, error: 'Server returned an invalid response. Missing agentId or agentSecret.' };
      }
      console.log("[main.js] register-agent: Returning success IPC result");
      return { success: true, agentId, agentSecret };
    } catch (error) {
      console.error("[main.js] register-agent HTTP POST ERROR:", error.message, error.stack);
      if (error.response) {
        console.error("[main.js] register-agent error response data:", JSON.stringify(error.response.data, null, 2));
      }
      return { 
        success: false, 
        error: error.response?.data?.message || error.response?.data?.error || error.message 
      };
    }
  });

  ipcMain.handle('get-os-info', () => {
    return {
      machineName: os.hostname(),
      windowsVersion: os.release(),
      agentVersion: app.getVersion()
    };
  });

  createTray();
  
  const agentId = store.get('agentId');
  if (!agentId) {
    createSetupWindow();
  } else {
    runAgent();
  }
});

function runAgent() {
  const agentId = store.get('agentId');
  const agentSecret = store.get('agentSecret');
  const defaultPrinter = store.get('defaultPrinter');
  
  if (agentId && agentSecret) {
    startAgent({
      backendUrl: BACKEND_URL,
      agentId,
      agentSecret,
      defaultPrinter
    }, () => {
      // onDeregistered callback
      store.delete('agentId');
      store.delete('agentSecret');
      store.delete('defaultPrinter');
      store.delete('registeredAt');
      dialog.showMessageBoxSync({
        type: 'warning',
        title: 'Agent Deregistered',
        message: 'This agent has been deregistered by an administrator.\nPlease contact your admin to re-register.'
      });
      createSetupWindow();
    });
  }
}

app.on('window-all-closed', () => {
  // Overridden to prevent app exit when closing setup window
  // App should run in background.
});
