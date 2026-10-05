let currentStep = 1;
let detectedPrinters = [];
let selectedPrinter = '';
let registrationToken = '';

const wizard = document.getElementById('wizard');
const dashboard = document.getElementById('dashboard');
const headerTitle = document.getElementById('header-title');
const wizardFooter = document.getElementById('wizard-footer');

const steps = [
  document.getElementById('step1'),
  document.getElementById('step2'),
  document.getElementById('step3'),
  document.getElementById('step4'),
  document.getElementById('step5'),
  document.getElementById('step6')
];

const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');

async function init() {
  const status = await window.api.getStatus();
  if (status.agentId) {
    // Already configured
    wizard.style.display = 'none';
    wizardFooter.style.display = 'none';
    dashboard.style.display = 'block';
    headerTitle.innerText = 'Print Agent Status';
    
    document.getElementById('dashAgentId').innerText = status.agentId;
    document.getElementById('dashPrinter').innerText = status.printerName;
    document.getElementById('dashBackend').innerText = status.backendUrl;
    
    const dashStatus = document.getElementById('dashStatus');
    if (status.connected) {
      dashStatus.innerText = 'Connected';
      dashStatus.className = 'status-val badge badge-green';
    } else {
      dashStatus.innerText = 'Disconnected';
      dashStatus.className = 'status-val badge badge-red';
    }
  } else {
    // Setup Wizard
    showStep(1);
  }
}

function showStep(n) {
  steps.forEach((el, index) => {
    if (index + 1 === n) el.classList.add('active');
    else el.classList.remove('active');
  });
  
  currentStep = n;
  
  btnBack.style.display = n > 1 && n < 5 ? 'block' : 'none';
  
  if (n === 1) {
    btnNext.innerText = 'Next';
    btnNext.disabled = false;
  }
  else if (n === 2) {
    btnNext.disabled = true;
    discoverPrinters();
  }
  else if (n === 3) {
    btnNext.innerText = 'Next';
    btnNext.disabled = !selectedPrinter;
  }
  else if (n === 4) {
    btnNext.innerText = 'Register Agent';
    btnNext.disabled = true; // wait for test print success
  }
  else if (n === 5) {
    btnNext.style.display = 'none';
    btnBack.style.display = 'none';
    
    // Show wait message after 5 seconds
    setTimeout(() => {
      const waitMsg = document.getElementById('regWaitMsg');
      if (waitMsg && currentStep === 5) {
        waitMsg.style.display = 'block';
      }
    }, 5000);
    
    registerAgent();
  }
  else if (n === 6) {
    btnNext.style.display = 'block';
    btnNext.innerText = 'Finish';
  }
}

btnNext.addEventListener('click', () => {
  if (currentStep === 1) {
    registrationToken = document.getElementById('regToken').value.trim();
    if (!registrationToken) return alert('Please enter token');
    showStep(2);
  }
  else if (currentStep === 3) {
    showStep(4);
  }
  else if (currentStep === 4) {
    showStep(5);
  }
  else if (currentStep === 6) {
    window.close(); // Finish will close wizard, agent already running
  }
});

btnBack.addEventListener('click', () => {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
});

async function discoverPrinters() {
  detectedPrinters = await window.api.getPrinters();
  const listEl = document.getElementById('printerList');
  listEl.innerHTML = '';
  
  if (detectedPrinters.length === 0) {
    listEl.innerHTML = '<p class="error-msg">No printers found. You can still continue, but printing will fail.</p>';
    selectedPrinter = 'none';
    setTimeout(() => { showStep(3); }, 1500);
    return;
  }
  
  detectedPrinters.forEach((name, i) => {
    const lbl = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'printerSelection';
    radio.value = name;
    if (i === 0) {
      radio.checked = true;
      selectedPrinter = name;
    }
    radio.onchange = (e) => {
      selectedPrinter = e.target.value;
      btnNext.disabled = false;
    };
    
    lbl.appendChild(radio);
    lbl.appendChild(document.createTextNode(' ' + name));
    listEl.appendChild(lbl);
  });
  
  setTimeout(() => { showStep(3); }, 1000);
}

const btnTestPrint = document.getElementById('btnTestPrint');
if (btnTestPrint) {
  btnTestPrint.addEventListener('click', async () => {
    btnTestPrint.disabled = true;
    btnTestPrint.innerText = 'Printing...';
    const resEl = document.getElementById('testPrintRes4');
    resEl.innerHTML = '';
    const result = await window.api.testPrint(selectedPrinter);
    if (result.success) {
      resEl.innerHTML = '<div class="success-msg">Test print sent successfully.</div>';
      btnNext.disabled = false; // allow next
    } else {
      let errorHtml = '';
      if (result.error && result.error.includes('Command failed')) {
        errorHtml = `
          <div class="error-msg" style="text-align: left; padding: 12px; background: #fee2e2; border-radius: 8px; border: 1px solid #fca5a5;">
            <strong>❌ Printer "${selectedPrinter}" is offline or unavailable.</strong><br/><br/>
            Please:<br/>
            • Turn on the printer.<br/>
            • Check the USB/Wi-Fi connection.<br/>
            • Ensure Windows shows the printer as Ready.
            <div style="font-size: 10px; margin-top: 8px; color: #7f1d1d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${result.error}">
              Technical details: ${result.error}
            </div>
          </div>
        `;
      } else {
        errorHtml = `<div class="error-msg">Error: ${result.error}</div>`;
      }
      resEl.innerHTML = errorHtml;
    }
    btnTestPrint.disabled = false;
    btnTestPrint.innerText = 'Test Print';
  });
}

async function registerAgent() {
  console.log("Renderer: Step 5 started");
  try {
    const osInfo = await window.api.getOsInfo();
    console.log("Renderer: OS info retrieved", osInfo);
    
    const payload = {
      registrationToken,
      machineName: osInfo.machineName,
      windowsVersion: osInfo.windowsVersion,
      agentVersion: osInfo.agentVersion,
      installedPrinters: detectedPrinters,
      defaultPrinter: selectedPrinter
    };
    
    console.log("Renderer: Calling window.api.registerAgent with payload", JSON.stringify(payload, null, 2));
    const res = await window.api.registerAgent(payload);
    console.log("Renderer: registerAgent returned", JSON.stringify(res, null, 2));
    
    if (res.success) {
      const { agentId, agentSecret } = res;
      console.log("Renderer: Extracted agentId and agentSecret", { agentId, agentSecret });
      console.log("Renderer: Calling saveConfig");
      
      const saveRes = await window.api.saveConfig({
        agentId,
        agentSecret,
        defaultPrinter: selectedPrinter
      });
      console.log("Renderer: saveConfig completed", saveRes);
      
      console.log("Renderer: Registration flow complete, moving to step 6");
      document.getElementById('finalAgentId').innerText = agentId;
      showStep(6);
    } else {
      console.log("Renderer: Registration failed response", res.error);
      document.getElementById('regSpinner').style.display = 'none';
      const waitMsg = document.getElementById('regWaitMsg');
      if (waitMsg) waitMsg.style.display = 'none';
      document.getElementById('regText').innerText = 'Registration Failed';
      document.getElementById('regError').innerText = res.error || 'Unknown error';
      btnBack.style.display = 'block';
    }
  } catch (error) {
    console.error("Renderer: FATAL ERROR in registerAgent:", error.message, error.stack);
    document.getElementById('regSpinner').style.display = 'none';
    const waitMsg = document.getElementById('regWaitMsg');
    if (waitMsg) waitMsg.style.display = 'none';
    document.getElementById('regText').innerText = 'Registration Failed (Exception)';
    document.getElementById('regError').innerText = error.message;
    btnBack.style.display = 'block';
  }
}

init();
