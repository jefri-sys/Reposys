const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function renderDiagrams() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // -------------------------------------------------------------
  // DIAGRAM 1: CORE REPOSYS ER DIAGRAM (Exact match to lighttheme.jpg)
  // -------------------------------------------------------------
  const htmlCore = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 960px;
    height: 480px;
  }
  .canvas {
    position: relative;
    width: 920px;
    height: 440px;
    background: #ffffff;
  }
  svg.diagram {
    position: absolute;
    top: 0;
    left: 0;
    width: 920px;
    height: 440px;
    z-index: 1;
  }
  .entity-card {
    position: absolute;
    background: #ffffff;
    border: 1.5px solid #a8a8a8;
    border-radius: 6px;
    overflow: hidden;
    z-index: 2;
  }
  .entity-header {
    background: #d8d8d8;
    padding: 7px 12px;
    font-size: 15px;
    font-weight: bold;
    color: #1a1a1a;
    text-align: center;
    border-bottom: 1.5px solid #a8a8a8;
    letter-spacing: 0.2px;
  }
  .attribute-list {
    padding: 0;
  }
  .attribute-row {
    padding: 5px 12px;
    font-size: 13px;
    color: #262626;
    border-bottom: 1px solid #e2e2e2;
    line-height: 1.25;
  }
  .attribute-row:last-child {
    border-bottom: none;
  }
  .pk {
    text-decoration: underline;
    font-weight: bold;
  }
</style>
</head>
<body>
<div class="canvas">
  <svg class="diagram">
    <defs>
      <style>
        .line { stroke: #777777; stroke-width: 1.5; fill: none; }
        .diamond-poly { fill: #ffffff; stroke: #666666; stroke-width: 1.5; }
        .diamond-label { font-family: Arial, Helvetica, sans-serif; font-size: 13.5px; fill: #1a1a1a; text-anchor: middle; dominant-baseline: central; font-weight: normal; }
        .card-num { font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; font-weight: bold; fill: #444444; }
      </style>
    </defs>

    <!-- 1. USER -> PLACES -> ORDER -->
    <line x1="210" y1="160" x2="257" y2="160" class="line" />
    <polygon points="305,132 353,160 305,188 257,160" class="diamond-poly" />
    <text x="305" y="160" class="diamond-label">places</text>
    <line x1="353" y1="160" x2="400" y2="160" class="line" />
    <text x="220" y="150" class="card-num">1</text>
    <text x="385" y="150" class="card-num">N</text>

    <!-- 2. ORDER -> OVERSEES -> ADMIN -->
    <line x1="590" y1="135" x2="617" y2="135" class="line" />
    <polygon points="665,107 713,135 665,163 617,135" class="diamond-poly" />
    <text x="665" y="135" class="diamond-label">oversees</text>
    <line x1="713" y1="135" x2="740" y2="135" class="line" />
    <text x="600" y="125" class="card-num">N</text>
    <text x="725" y="125" class="card-num">1</text>

    <!-- 3. ORDER -> ROUTED_TO -> KIOSK_PRINTER -->
    <!-- Order bottom is at y=312. Line goes from (495, 312) to top vertex (495, 369) -->
    <line x1="495" y1="312" x2="495" y2="369" class="line" />
    <polygon points="495,369 547,395 495,421 443,395" class="diamond-poly" />
    <text x="495" y="395" class="diamond-label">routed_to</text>
    <line x1="547" y1="395" x2="740" y2="395" class="line" />
    <text x="505" y="335" class="card-num">1</text>
    <text x="725" y="385" class="card-num">1</text>
  </svg>

  <!-- ENTITY: USER -->
  <div class="entity-card" style="left: 40px; top: 40px; width: 170px;">
    <div class="entity-header">User</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">User_ID</span></div>
      <div class="attribute-row">Name</div>
      <div class="attribute-row">Email</div>
      <div class="attribute-row">College_ID</div>
      <div class="attribute-row">Department</div>
      <div class="attribute-row">Role</div>
      <div class="attribute-row">Wallet_Balance</div>
    </div>
  </div>

  <!-- ENTITY: ORDER -->
  <div class="entity-card" style="left: 400px; top: 25px; width: 190px;">
    <div class="entity-header">Order</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">Order_ID</span></div>
      <div class="attribute-row">User_ID</div>
      <div class="attribute-row">Service_Type</div>
      <div class="attribute-row">Page_Count</div>
      <div class="attribute-row">Estimated_Cost</div>
      <div class="attribute-row">Final_Cost</div>
      <div class="attribute-row">Payment_Status</div>
      <div class="attribute-row">Pickup_OTP</div>
      <div class="attribute-row">Status</div>
    </div>
  </div>

  <!-- ENTITY: ADMIN -->
  <div class="entity-card" style="left: 740px; top: 40px; width: 150px;">
    <div class="entity-header">Admin</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">Admin_ID</span></div>
      <div class="attribute-row">Username</div>
      <div class="attribute-row">Password</div>
      <div class="attribute-row">Role</div>
      <div class="attribute-row">Department</div>
    </div>
  </div>

  <!-- ENTITY: KIOSK_PRINTER -->
  <div class="entity-card" style="left: 740px; top: 300px; width: 150px;">
    <div class="entity-header">Kiosk_Printer</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">Device_ID</span></div>
      <div class="attribute-row">Printer_Name</div>
      <div class="attribute-row">Paper_Level</div>
      <div class="attribute-row">Toner_Level</div>
      <div class="attribute-row">Status</div>
    </div>
  </div>
</div>
</body>
</html>
  `;

  // -------------------------------------------------------------
  // DIAGRAM 2: FULL PHYSICAL REPOSYS ER DIAGRAM (Balanced 8 Entities)
  // -------------------------------------------------------------
  const htmlFull = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 1360px;
    height: 1040px;
  }
  .canvas {
    position: relative;
    width: 1300px;
    height: 980px;
    background: #ffffff;
  }
  svg.diagram {
    position: absolute;
    top: 0;
    left: 0;
    width: 1300px;
    height: 980px;
    z-index: 1;
  }
  .entity-card {
    position: absolute;
    background: #ffffff;
    border: 1.5px solid #a8a8a8;
    border-radius: 6px;
    overflow: hidden;
    z-index: 2;
  }
  .entity-header {
    background: #d8d8d8;
    padding: 7px 12px;
    font-size: 14.5px;
    font-weight: bold;
    color: #1a1a1a;
    text-align: center;
    border-bottom: 1.5px solid #a8a8a8;
    letter-spacing: 0.2px;
  }
  .attribute-list {
    padding: 0;
  }
  .attribute-row {
    padding: 4.5px 12px;
    font-size: 12.5px;
    color: #262626;
    border-bottom: 1px solid #e4e4e4;
    line-height: 1.3;
    white-space: nowrap;
  }
  .attribute-row:last-child {
    border-bottom: none;
  }
  .pk {
    text-decoration: underline;
    font-weight: bold;
  }
  .fk {
    font-style: italic;
    color: #444444;
  }
</style>
</head>
<body>
<div class="canvas">
  <svg class="diagram">
    <defs>
      <style>
        .line { stroke: #777777; stroke-width: 1.5; fill: none; }
        .diamond-poly { fill: #ffffff; stroke: #666666; stroke-width: 1.5; }
        .diamond-label { font-family: Arial, Helvetica, sans-serif; font-size: 13px; fill: #1a1a1a; text-anchor: middle; dominant-baseline: central; font-weight: normal; }
        .card-num { font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; fill: #444444; }
      </style>
    </defs>

    <!-- 1. WALLET -> OWNS -> USER -->
    <line x1="240" y1="140" x2="334" y2="140" class="line" />
    <polygon points="380,114 426,140 380,166 334,140" class="diamond-poly" />
    <text x="380" y="140" class="diamond-label">owns</text>
    <line x1="426" y1="140" x2="520" y2="140" class="line" />
    <text x="250" y="130" class="card-num">1</text>
    <text x="505" y="130" class="card-num">1</text>

    <!-- 2. USER -> PLACES -> ORDER -->
    <line x1="630" y1="275" x2="630" y2="306" class="line" />
    <polygon points="630,306 678,332 630,358 582,332" class="diamond-poly" />
    <text x="630" y="332" class="diamond-label">places</text>
    <line x1="630" y1="358" x2="630" y2="390" class="line" />
    <text x="640" y="295" class="card-num">1</text>
    <text x="640" y="380" class="card-num">N</text>

    <!-- 3. PAYMENT -> SETTLES -> ORDER -->
    <line x1="240" y1="465" x2="329" y2="465" class="line" />
    <polygon points="375,439 421,465 375,491 329,465" class="diamond-poly" />
    <text x="375" y="465" class="diamond-label">settles</text>
    <line x1="421" y1="465" x2="510" y2="465" class="line" />
    <text x="250" y="455" class="card-num">1</text>
    <text x="495" y="455" class="card-num">1</text>

    <!-- 4. DOCUMENT -> CONTAINS -> ORDER -->
    <!-- Document right edge: (240, 775) -> horizontal to diamond cx=375, cy=575 -->
    <line x1="240" y1="775" x2="375" y2="775" class="line" />
    <line x1="375" y1="775" x2="375" y2="601" class="line" />
    <polygon points="375,549 421,575 375,601 329,575" class="diamond-poly" />
    <text x="375" y="575" class="diamond-label">contains</text>
    <line x1="421" y1="575" x2="510" y2="575" class="line" />
    <text x="250" y="765" class="card-num">N</text>
    <text x="495" y="565" class="card-num">1</text>

    <!-- 5. ORDER -> SPAWNS -> PRINT_JOB -->
    <line x1="630" y1="685" x2="630" y2="716" class="line" />
    <polygon points="630,716 676,740 630,764 584,740" class="diamond-poly" />
    <text x="630" y="740" class="diamond-label">spawns</text>
    <line x1="630" y1="764" x2="630" y2="780" class="line" />
    <text x="640" y="705" class="card-num">1</text>
    <text x="640" y="775" class="card-num">1</text>

    <!-- 6. PRINT_JOB -> ROUTES_TO -> PRINTER -->
    <line x1="750" y1="845" x2="842" y2="845" class="line" />
    <polygon points="890,819 938,845 890,871 842,845" class="diamond-poly" />
    <text x="890" y="845" class="diamond-label">routes_to</text>
    <line x1="938" y1="845" x2="1030" y2="845" class="line" />
    <text x="760" y="835" class="card-num">N</text>
    <text x="1015" y="835" class="card-num">1</text>

    <!-- 7. PRINT_AGENT -> MANAGES -> PRINTER -->
    <line x1="1140" y1="240" x2="1140" y2="449" class="line" />
    <polygon points="1140,449 1188,475 1140,501 1092,475" class="diamond-poly" />
    <text x="1140" y="475" class="diamond-label">manages</text>
    <line x1="1140" y1="501" x2="1140" y2="710" class="line" />
    <text x="1150" y="260" class="card-num">1</text>
    <text x="1150" y="695" class="card-num">N</text>

    <!-- 8. ORDER -> DISPATCHES -> PRINTER -->
    <line x1="750" y1="475" x2="842" y2="475" class="line" />
    <polygon points="890,449 938,475 890,501 842,475" class="diamond-poly" />
    <text x="890" y="475" class="diamond-label">dispatches</text>
    <line x1="938" y1="475" x2="975" y2="475" class="line" />
    <line x1="975" y1="475" x2="975" y2="745" class="line" />
    <line x1="975" y1="745" x2="1030" y2="745" class="line" />
    <text x="760" y="465" class="card-num">1</text>
    <text x="1015" y="735" class="card-num">N</text>
  </svg>

  <!-- ENTITY: WALLET -->
  <div class="entity-card" style="left: 40px; top: 40px; width: 200px;">
    <div class="entity-header">Wallet</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">_id</span> (PK)</div>
      <div class="attribute-row"><span class="fk">userId</span> (FK)</div>
      <div class="attribute-row">balance</div>
      <div class="attribute-row">hasSeenOnboarding</div>
      <div class="attribute-row">createdAt</div>
    </div>
  </div>

  <!-- ENTITY: USER -->
  <div class="entity-card" style="left: 520px; top: 35px; width: 220px;">
    <div class="entity-header">User</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">_id</span> (PK)</div>
      <div class="attribute-row">name</div>
      <div class="attribute-row">email</div>
      <div class="attribute-row">collegeId</div>
      <div class="attribute-row">department</div>
      <div class="attribute-row">role</div>
      <div class="attribute-row">verified</div>
      <div class="attribute-row">isActive</div>
    </div>
  </div>

  <!-- ENTITY: PAYMENT -->
  <div class="entity-card" style="left: 40px; top: 350px; width: 200px;">
    <div class="entity-header">Payment</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">_id</span> (PK)</div>
      <div class="attribute-row"><span class="fk">orderId</span> (FK)</div>
      <div class="attribute-row"><span class="fk">userId</span> (FK)</div>
      <div class="attribute-row">amount</div>
      <div class="attribute-row">currency</div>
      <div class="attribute-row">method</div>
      <div class="attribute-row">status</div>
      <div class="attribute-row">razorpayOrderId</div>
    </div>
  </div>

  <!-- ENTITY: ORDER -->
  <div class="entity-card" style="left: 510px; top: 390px; width: 240px;">
    <div class="entity-header">Order</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">_id</span> (PK)</div>
      <div class="attribute-row"><span class="fk">userId</span> (FK)</div>
      <div class="attribute-row">serviceType</div>
      <div class="attribute-row">pageCount</div>
      <div class="attribute-row">estimatedCost</div>
      <div class="attribute-row">finalCost</div>
      <div class="attribute-row">paymentStatus</div>
      <div class="attribute-row">pickupOtp</div>
      <div class="attribute-row">priorityScore</div>
      <div class="attribute-row">status</div>
    </div>
  </div>

  <!-- ENTITY: DOCUMENT -->
  <div class="entity-card" style="left: 40px; top: 680px; width: 200px;">
    <div class="entity-header">Document</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">_id</span> (PK)</div>
      <div class="attribute-row"><span class="fk">ownerId</span> (FK)</div>
      <div class="attribute-row">originalFilename</div>
      <div class="attribute-row">fileType</div>
      <div class="attribute-row">pageCount</div>
      <div class="attribute-row">cloudinaryUrl</div>
    </div>
  </div>

  <!-- ENTITY: PRINT_JOB -->
  <div class="entity-card" style="left: 510px; top: 780px; width: 240px;">
    <div class="entity-header">Print_Job</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">_id</span> (PK)</div>
      <div class="attribute-row"><span class="fk">orderId</span> (FK)</div>
      <div class="attribute-row">printerId</div>
      <div class="attribute-row">windowsPrinterName</div>
      <div class="attribute-row">status</div>
      <div class="attribute-row">copies</div>
      <div class="attribute-row">colorMode</div>
    </div>
  </div>

  <!-- ENTITY: PRINTER -->
  <div class="entity-card" style="left: 1030px; top: 710px; width: 220px;">
    <div class="entity-header">Printer</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">_id</span> (PK)</div>
      <div class="attribute-row">printerId</div>
      <div class="attribute-row">friendlyName</div>
      <div class="attribute-row">windowsPrinterName</div>
      <div class="attribute-row">currentStatus</div>
      <div class="attribute-row">paperLevel</div>
      <div class="attribute-row">tonerLevel</div>
    </div>
  </div>

  <!-- ENTITY: PRINT_AGENT -->
  <div class="entity-card" style="left: 1030px; top: 50px; width: 220px;">
    <div class="entity-header">Print_Agent</div>
    <div class="attribute-list">
      <div class="attribute-row"><span class="pk">agentId</span> (PK)</div>
      <div class="attribute-row">machineName</div>
      <div class="attribute-row">windowsVersion</div>
      <div class="attribute-row">agentVersion</div>
      <div class="attribute-row">isOnline</div>
      <div class="attribute-row">lastHeartbeat</div>
    </div>
  </div>
</div>
</body>
</html>
  `;

  const coreHtmlPath = path.resolve(__dirname, 'temp_er_core.html');
  const fullHtmlPath = path.resolve(__dirname, 'temp_er_full.html');

  fs.writeFileSync(coreHtmlPath, htmlCore);
  fs.writeFileSync(fullHtmlPath, htmlFull);

  // Render Core Diagram at 2.5x device scale for high DPI
  await page.setViewport({ width: 960, height: 480, deviceScaleFactor: 2.5 });
  await page.goto('file://' + coreHtmlPath, { waitUntil: 'networkidle0' });
  
  const outCorePath = 'D:\\staffs automated\\Resources\\figures\\reposys_er_light_core.png';
  const outCoreLocal = path.resolve(__dirname, '..', 'figures', 'reposys_er_light_core.png');
  await page.screenshot({ path: outCorePath, type: 'png' });
  fs.copyFileSync(outCorePath, outCoreLocal);
  console.log('Generated:', outCorePath);

  // Render Full Physical Diagram at 2.5x scale
  await page.setViewport({ width: 1360, height: 1040, deviceScaleFactor: 2.5 });
  await page.goto('file://' + fullHtmlPath, { waitUntil: 'networkidle0' });

  const outFullPath = 'D:\\staffs automated\\Resources\\figures\\reposys_er_light_physical.png';
  const outFullLocal = path.resolve(__dirname, '..', 'figures', 'reposys_er_light_physical.png');
  await page.screenshot({ path: outFullPath, type: 'png' });
  fs.copyFileSync(outFullPath, outFullLocal);
  console.log('Generated:', outFullPath);

  // Also copy to artifacts directory for inline chat viewing
  const artifactDir = 'C:\\Users\\itsme\\.gemini\\antigravity\\brain\\9bc9270b-d865-4a60-b0ad-b91dfab949ce';
  fs.copyFileSync(outCorePath, path.join(artifactDir, 'reposys_er_light_core.png'));
  fs.copyFileSync(outFullPath, path.join(artifactDir, 'reposys_er_light_physical.png'));

  // Clean up temp html
  fs.unlinkSync(coreHtmlPath);
  fs.unlinkSync(fullHtmlPath);

  await browser.close();
  console.log('All refined light mode ER diagrams rendered successfully!');
}

renderDiagrams().catch(console.error);
