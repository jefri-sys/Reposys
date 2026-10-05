const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        const htmlPath = path.resolve(__dirname, '../../Database_Design_Document.html');
        const pdfPath = path.resolve(__dirname, '../../Table_Design_and_Database_Customization.pdf');
        
        const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '2cm',
                bottom: '2cm',
                left: '2cm',
                right: '2cm'
            }
        });
        
        await browser.close();
        console.log('PDF generated successfully at:', pdfPath);
    } catch (err) {
        console.error('Failed to generate PDF:', err);
    }
})();
