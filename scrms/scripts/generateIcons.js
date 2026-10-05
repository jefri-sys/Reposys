const fs = require('fs');
const path = require('path');
const sharp = require('../backend/node_modules/sharp');

const OUTPUT_DIR = path.resolve(__dirname, '../frontend/public');
const BACKGROUND_COLOR = '#1D4ED8';
const ICON_SIZES = [192, 512];

const createIconSvg = (size) => {
  const printerX = size * 0.19;
  const printerY = size * 0.31;
  const printerWidth = size * 0.62;
  const printerHeight = size * 0.34;
  const topWidth = size * 0.42;
  const topHeight = size * 0.14;
  const topX = (size - topWidth) / 2;
  const topY = size * 0.17;
  const paperWidth = size * 0.3;
  const paperHeight = size * 0.24;
  const paperX = (size - paperWidth) / 2;
  const paperY = size * 0.09;
  const outputTrayX = size * 0.25;
  const outputTrayY = size * 0.54;
  const outputTrayWidth = size * 0.5;
  const outputTrayHeight = size * 0.12;
  const detailWidth = size * 0.08;
  const detailHeight = size * 0.04;
  const detailRadius = size * 0.02;
  const lineX = paperX + size * 0.05;
  const lineWidth = paperWidth - size * 0.1;
  const lineHeight = Math.max(4, size * 0.015);
  const lineGap = size * 0.04;
  const foldSize = size * 0.06;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${BACKGROUND_COLOR}" />
      <rect x="${topX}" y="${topY}" width="${topWidth}" height="${topHeight}" rx="${size * 0.035}" fill="#FFFFFF" />
      <path d="M ${paperX} ${paperY + foldSize}
               V ${paperY + paperHeight}
               H ${paperX + paperWidth}
               V ${paperY + foldSize}
               L ${paperX + paperWidth - foldSize} ${paperY}
               H ${paperX + foldSize}
               A ${size * 0.025} ${size * 0.025} 0 0 0 ${paperX} ${paperY + foldSize} Z" fill="#FFFFFF" />
      <path d="M ${paperX + paperWidth - foldSize} ${paperY}
               V ${paperY + foldSize}
               H ${paperX + paperWidth}
               Z" fill="${BACKGROUND_COLOR}" opacity="0.18" />
      <rect x="${printerX}" y="${printerY}" width="${printerWidth}" height="${printerHeight}" rx="${size * 0.07}" fill="#FFFFFF" />
      <rect x="${outputTrayX}" y="${outputTrayY}" width="${outputTrayWidth}" height="${outputTrayHeight}" rx="${size * 0.03}" fill="${BACKGROUND_COLOR}" opacity="0.18" />
      <rect x="${printerX + size * 0.08}" y="${printerY + size * 0.08}" width="${detailWidth}" height="${detailHeight}" rx="${detailRadius}" fill="${BACKGROUND_COLOR}" opacity="0.22" />
      <rect x="${printerX + printerWidth - size * 0.16}" y="${printerY + size * 0.08}" width="${detailWidth}" height="${detailHeight}" rx="${detailRadius}" fill="${BACKGROUND_COLOR}" opacity="0.22" />
      <rect x="${lineX}" y="${paperY + size * 0.07}" width="${lineWidth}" height="${lineHeight}" rx="${lineHeight / 2}" fill="${BACKGROUND_COLOR}" opacity="0.22" />
      <rect x="${lineX}" y="${paperY + size * 0.07 + lineGap}" width="${lineWidth * 0.82}" height="${lineHeight}" rx="${lineHeight / 2}" fill="${BACKGROUND_COLOR}" opacity="0.22" />
    </svg>
  `;
};

const ensureOutputDir = () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
};

const generateIcons = async () => {
  ensureOutputDir();

  for (const size of ICON_SIZES) {
    const outputFile = path.join(OUTPUT_DIR, `icon-${size}.png`);
    const svg = createIconSvg(size);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputFile);

    console.log(`Created ${outputFile}`);
  }
};

generateIcons().catch((error) => {
  console.error('Failed to generate Reposys PWA icons:', error);
  process.exit(1);
});
