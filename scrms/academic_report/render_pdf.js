const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  try {
    const htmlPath = path.resolve(__dirname, 'report.html');
    const pdfPath = path.resolve(__dirname, 'Report_34.pdf');

    if (!fs.existsSync(htmlPath)) {
      console.error('report.html not found!');
      process.exit(1);
    }

    console.log('Launching Puppeteer Chrome...');
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    console.log('Loading report.html...');
    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('Rendering PDF matching sample PDF margins, running header and running footer...');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: {
        top: '1in',
        bottom: '1in',
        left: '1.25in',
        right: '1in'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div style="width: 100%; font-family: \'Times New Roman\', Times, serif; font-size: 9.5pt; font-style: italic; text-align: right; padding-right: 1in; color: #000;"><span>REPOSYS -- Campus Reprography Automation System</span></div>',
      footerTemplate: '<div style="width: 100%; font-family: \'Times New Roman\', Times, serif; font-size: 9.5pt; display: flex; justify-content: space-between; padding-left: 1.25in; padding-right: 1in; color: #000;"><span>Saintgits College of Engineering (Autonomous)</span><span class="pageNumber"></span></div>',
      printBackground: true
    });

    await browser.close();
    console.log(`Successfully generated PDF report: ${pdfPath}`);

    // Sync to Resources and scrms root
    const targets = [
      path.resolve(__dirname, '..', 'Report_34.pdf'),
      'D:\\staffs automated\\Resources\\Report_34.pdf',
      path.resolve(__dirname, 'REPOSYS_Mini_Project_Report.pdf'),
      'D:\\staffs automated\\Resources\\REPOSYS_Mini_Project_Report.pdf'
    ];
    for (const t of targets) {
      fs.copyFileSync(pdfPath, t);
      console.log(`Synced to: ${t}`);
    }
  } catch (err) {
    console.error('Error generating PDF:', err);
    process.exit(1);
  }
})();
