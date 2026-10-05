const path = require('path');
const { pathToFileURL } = require('url');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const canvas = require('canvas');
const { createCanvas, DOMMatrix, ImageData } = canvas;

// Polyfill globals needed by pdfjs-dist v5.x in a Node environment
if (!global.DOMMatrix) {
  global.DOMMatrix = DOMMatrix;
}
if (!global.ImageData) {
  global.ImageData = ImageData;
}

const PDFJS_ENTRY = 'pdfjs-dist/legacy/build/pdf.mjs';
const COLOUR_SATURATION_THRESHOLD = 0.2;
const COLOUR_HEAVY_RATIO_THRESHOLD = 0.1;
const BLANK_PAGE_BRIGHTNESS_THRESHOLD = 248;
const BLANK_PAGE_STDDEV_THRESHOLD = 8;
const BLANK_PAGE_NON_WHITE_RATIO_THRESHOLD = 0.003;
const NON_WHITE_BRIGHTNESS_THRESHOLD = 245;
const MAX_PDF_ANALYSIS_PAGES = Number(process.env.MAX_PDF_ANALYSIS_PAGES || 5);
const PDF_ANALYSIS_RENDER_SCALE = Number(process.env.PDF_ANALYSIS_RENDER_SCALE || 0.5);
const STANDARD_FONT_DATA_URL = `${pathToFileURL(
  path.join(__dirname, '../../node_modules/pdfjs-dist/standard_fonts')
).href}/`;

const isEncryptedPdfError = (error) => /encrypted/i.test(error?.message || '');

class NodeCanvasFactory {
  create(width, height) {
    if (width <= 0 || height <= 0) {
      throw new Error('Invalid canvas size');
    }

    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    return {
      canvas,
      context,
    };
  }

  reset(canvasAndContext, width, height) {
    if (!canvasAndContext?.canvas || !canvasAndContext?.context) {
      throw new Error('Canvas is not specified');
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Invalid canvas size');
    }

    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    if (!canvasAndContext?.canvas) {
      return;
    }

    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

const getImagePixelAnalysis = async (input) => {
  const pipeline = Buffer.isBuffer(input)
    ? sharp(input)
    : sharp(input.toBuffer('image/png'));

  const { data, info } = await pipeline
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let meanBrightness = 0;
  let brightnessM2 = 0;
  let pixelCount = 0;
  let colourPixelCount = 0;
  let nonWhitePixelCount = 0;

  for (let index = 0; index < data.length; index += info.channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const brightness = (red + green + blue) / 3;

    pixelCount += 1;
    const brightnessDelta = brightness - meanBrightness;
    meanBrightness += brightnessDelta / pixelCount;
    brightnessM2 += brightnessDelta * (brightness - meanBrightness);

    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;

    if (saturation > COLOUR_SATURATION_THRESHOLD) {
      colourPixelCount += 1;
    }

    if (brightness < NON_WHITE_BRIGHTNESS_THRESHOLD) {
      nonWhitePixelCount += 1;
    }
  }

  return {
    height: info.height,
    isColourHeavy: pixelCount > 0 && (colourPixelCount / pixelCount) > COLOUR_HEAVY_RATIO_THRESHOLD,
    meanBrightness,
    nonWhitePixelRatio: pixelCount > 0 ? nonWhitePixelCount / pixelCount : 0,
    standardDeviation: pixelCount > 0 ? Math.sqrt(brightnessM2 / pixelCount) : 0,
    width: info.width,
  };
};

const analyzeRenderedPage = (canvas) => getImagePixelAnalysis(canvas);

const hasMeaningfulTextContent = (textContent) => (
  Array.isArray(textContent?.items)
  && textContent.items.some((item) => typeof item?.str === 'string' && item.str.trim().length > 0)
);

const createMeaningfulOperatorSet = (OPS) => new Set([
  OPS.paintImageXObject,
  OPS.paintImageXObjectRepeat,
  OPS.paintInlineImageXObject,
  OPS.paintInlineImageXObjectGroup,
  OPS.paintImageMaskXObject,
  OPS.paintImageMaskXObjectGroup,
  OPS.paintImageMaskXObjectRepeat,
  OPS.paintSolidColorImageMask,
  OPS.paintXObject,
  OPS.paintFormXObjectBegin,
]);

const hasMeaningfulDrawingContent = (operatorList, meaningfulOperatorSet) => (
  Array.isArray(operatorList?.fnArray)
  && operatorList.fnArray.some((operation) => meaningfulOperatorSet.has(operation))
);

const buildQualityResult = (analysisByPage) => {
  const blankPages = [];
  const qualityIssues = [];
  const colourHeavyPages = [];

  for (const { pageNumber, analysis, hasMeaningfulText, hasMeaningfulDrawOps } of analysisByPage) {
    const isBlank = (
      analysis.meanBrightness >= BLANK_PAGE_BRIGHTNESS_THRESHOLD
      && analysis.standardDeviation <= BLANK_PAGE_STDDEV_THRESHOLD
      && analysis.nonWhitePixelRatio <= BLANK_PAGE_NON_WHITE_RATIO_THRESHOLD
      && !hasMeaningfulText
      && !hasMeaningfulDrawOps
    );

    if (isBlank) {
      blankPages.push(pageNumber);
    }

    if (analysis.meanBrightness < 50) {
      qualityIssues.push({ page: pageNumber, issue: 'TOO_DARK' });
    }

    if (analysis.meanBrightness > 200 && !isBlank) {
      qualityIssues.push({ page: pageNumber, issue: 'TOO_LIGHT' });
    }

    if (analysis.width < 150 || analysis.height < 150) {
      qualityIssues.push({ page: pageNumber, issue: 'LOW_RESOLUTION' });
    }

    if (analysis.isColourHeavy) {
      colourHeavyPages.push(pageNumber);
    }
  }

  return {
    blankPages,
    qualityIssues,
    colourHeavyPages,
  };
};

const getPageCount = async (buffer) => {
  try {
    const pdfDoc = await PDFDocument.load(buffer);

    return {
      pageCount: pdfDoc.getPageCount(),
      isPasswordProtected: false,
    };
  } catch (e) {
    if (isEncryptedPdfError(e)) {
      return {
        pageCount: 0,
        isPasswordProtected: true,
      };
    }
  }

  try {
    const pdfjsLib = await import(PDFJS_ENTRY);
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      isEvalSupported: false, // Added for security/stability in Node
    });
    const pdfDocument = await loadingTask.promise;

    try {
      return {
        pageCount: pdfDocument.numPages,
        isPasswordProtected: false,
      };
    } finally {
      await pdfDocument.destroy();
    }
  } catch (error) {
    if (isEncryptedPdfError(error)) {
      return {
        pageCount: 0,
        isPasswordProtected: true,
      };
    }

    throw error;
  }
};

const detectBlankAndQualityIssues = async (buffer) => {
  const pdfjsLib = await import(PDFJS_ENTRY);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    isEvalSupported: false,
  });
  let pdfDocument;

  try {
    pdfDocument = await loadingTask.promise;
    const canvasFactory = new NodeCanvasFactory();
    const meaningfulOperatorSet = createMeaningfulOperatorSet(pdfjsLib.OPS);
    const analysisByPage = [];

    const pagesToAnalyze = Math.min(
      pdfDocument.numPages,
      Number.isInteger(MAX_PDF_ANALYSIS_PAGES) && MAX_PDF_ANALYSIS_PAGES > 0
        ? MAX_PDF_ANALYSIS_PAGES
        : 5
    );

    for (let pageNumber = 1; pageNumber <= pagesToAnalyze; pageNumber += 1) {
      let page;
      let canvasAndContext;

      try {
        page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const operatorList = await page.getOperatorList();
        const viewport = page.getViewport({
          scale: Number.isFinite(PDF_ANALYSIS_RENDER_SCALE) && PDF_ANALYSIS_RENDER_SCALE > 0
            ? PDF_ANALYSIS_RENDER_SCALE
            : 0.5,
        });
        canvasAndContext = canvasFactory.create(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height)
        );

        await page.render({
          canvasContext: canvasAndContext.context,
          canvasFactory,
          viewport,
        }).promise;

        const analysis = await analyzeRenderedPage(canvasAndContext.canvas);
        analysisByPage.push({
          pageNumber,
          analysis,
          hasMeaningfulText: hasMeaningfulTextContent(textContent),
          hasMeaningfulDrawOps: hasMeaningfulDrawingContent(operatorList, meaningfulOperatorSet),
        });
      } catch (error) {
        console.warn(`Skipping analysis for PDF page ${pageNumber}:`, error);
      } finally {
        page?.cleanup();
        if (canvasAndContext) {
          canvasFactory.destroy(canvasAndContext);
        }
      }
    }

    return buildQualityResult(analysisByPage);
  } catch (error) {
    console.warn('PDF quality analysis failed; returning empty analysis results.', error);
    return buildQualityResult([]);
  } finally {
    if (pdfDocument) {
      await pdfDocument.destroy();
    }
  }
};

const analyzeImageQuality = async (buffer) => {
  const analysis = await getImagePixelAnalysis(buffer);
  return buildQualityResult([{
    pageNumber: 1,
    analysis,
    hasMeaningfulText: false,
    hasMeaningfulDrawOps: true,
  }]);
};

module.exports = {
  analyzeImageQuality,
  detectBlankAndQualityIssues,
  getPageCount,
};
