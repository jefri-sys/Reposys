const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream(path.join(assetsDir, 'test.pdf')));

doc.fontSize(25).text('Reposys Print Agent', 100, 100);
doc.fontSize(15).text('This is a test print generated during setup.', 100, 150);
doc.fontSize(12).text(`Generated at: ${new Date().toISOString()}`, 100, 200);

doc.end();
console.log('Generated assets/test.pdf');
