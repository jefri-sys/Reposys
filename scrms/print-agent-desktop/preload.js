const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getStatus: () => ipcRenderer.invoke('get-status'),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  testPrint: (printerName) => ipcRenderer.invoke('test-print', printerName),
  getDiagnostics: () => ipcRenderer.invoke('get-diagnostics'),
  registerAgent: (payload) => ipcRenderer.invoke('register-agent', payload),
  getOsInfo: () => ipcRenderer.invoke('get-os-info')
});
