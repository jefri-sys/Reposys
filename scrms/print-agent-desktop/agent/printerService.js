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

module.exports = {
  getPrintersPowerShell
};
