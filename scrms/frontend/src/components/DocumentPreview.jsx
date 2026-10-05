import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerSrc from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import api from '../services/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const THUMBNAIL_SCALE = 150 / 72;
const RATE_PER_PAGE = 1.5; // Default rate per page. Should match system config (₹1.5 per page).

const BADGE_STYLES = {
  BLANK: {
    borderClass: 'border-yellow-400',
    pillClass: 'bg-yellow-400 text-yellow-950',
    label: 'Blank',
    priority: 1,
  },
  TOO_DARK: {
    borderClass: 'border-rose-500',
    pillClass: 'bg-rose-500 text-white',
    label: 'Too Dark',
    priority: 4,
  },
  TOO_LIGHT: {
    borderClass: 'border-orange-400',
    pillClass: 'bg-orange-400 text-orange-950',
    label: 'Too Light',
    priority: 3,
  },
  LOW_RESOLUTION: {
    borderClass: 'border-rose-500',
    pillClass: 'bg-rose-500 text-white',
    label: 'Low Res',
    priority: 5,
  },
};

const getNormalizedAnalysisResults = (analysisResults) => ({
  blankPages: Array.isArray(analysisResults?.blankPages)
    ? analysisResults.blankPages
    : Array.isArray(analysisResults?.analysisResults?.blankPages)
      ? analysisResults.analysisResults.blankPages
      : [],
  colourHeavyPages: Array.isArray(analysisResults?.colourHeavyPages)
    ? analysisResults.colourHeavyPages
    : Array.isArray(analysisResults?.analysisResults?.colourHeavyPages)
      ? analysisResults.analysisResults.colourHeavyPages
      : [],
  qualityIssues: Array.isArray(analysisResults?.qualityIssues)
    ? analysisResults.qualityIssues
    : Array.isArray(analysisResults?.analysisResults?.qualityIssues)
      ? analysisResults.analysisResults.qualityIssues
      : [],
});

const isImageDocument = (fileType, cloudinaryUrl) => {
  if (fileType === 'jpg' || fileType === 'jpeg' || fileType === 'png') {
    return true;
  }

  return /\.(png|jpe?g)(?:$|\?)/i.test(cloudinaryUrl || '');
};

const getPageBadges = (pageNumber, normalizedAnalysis) => {
  const badges = [];

  if (normalizedAnalysis.blankPages.includes(pageNumber)) {
    badges.push(BADGE_STYLES.BLANK);
  }

  normalizedAnalysis.qualityIssues.forEach((issue) => {
    if (issue.page === pageNumber && BADGE_STYLES[issue.issue]) {
      badges.push(BADGE_STYLES[issue.issue]);
    }
  });

  return badges.slice().sort((left, right) => right.priority - left.priority);
};

const getBorderClass = (badges) => badges[0]?.borderClass || 'border-slate-200';

const getResolvedDocumentUrl = (documentUrl) => {
  if (!documentUrl) {
    return '';
  }

  return /^https?:\/\//i.test(documentUrl)
    ? documentUrl
    : new URL(documentUrl, window.location.origin).toString();
};

const DocumentPreview = ({
  // Original props
  documentId,
  cloudinaryUrl,
  analysisResults,
  fileType,
  onProceed,
  showProceedButton = true,
  proceedLabel = 'Proceed to Step 2',
  useSignedUrl = true,

  // New conversion preview props
  pdfBlob,
  originalFileName,
  onConfirm,
  onManualUpload,
  sizeWarning,
  sizeMB,
  confirmLabel = 'Looks good — Continue',
  cancelLabel = 'Upload PDF manually instead',
}) => {
  // --- STATE FOR ORIGINAL PREVIEW ---
  const canvasRefs = useRef([]);
  const pdfDocumentRef = useRef(null);
  const [pageNumbers, setPageNumbers] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [resolvedDocumentUrl, setResolvedDocumentUrl] = useState(() => getResolvedDocumentUrl(cloudinaryUrl));

  // --- STATE FOR NEW CONVERTED PREVIEW ---
  const [pages, setPages] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [renderError, setRenderError] = useState(null);

  const normalizedAnalysis = useMemo(
    () => getNormalizedAnalysisResults(analysisResults),
    [analysisResults]
  );

  const imagePreview = isImageDocument(fileType, cloudinaryUrl);
  const isReady = status === 'ready';

  // --- EFFECTS FOR ORIGINAL PREVIEW ---
  useEffect(() => {
    if (pdfBlob) return; // Skip if we're rendering converted preview

    let isCancelled = false;

    const resolvePreviewUrl = async () => {
      if (!cloudinaryUrl && !documentId) {
        setResolvedDocumentUrl('');
        return;
      }

      if (!documentId || !useSignedUrl) {
        setResolvedDocumentUrl(getResolvedDocumentUrl(cloudinaryUrl));
        return;
      }

      try {
        const response = await api.get(`/documents/${documentId}/url`);

        if (!isCancelled) {
          setResolvedDocumentUrl(getResolvedDocumentUrl(response.data?.url || ''));
        }
      } catch {
        if (!isCancelled) {
          setResolvedDocumentUrl('');
          setStatus('error');
          setError('Could not load the preview for this document.');
        }
      }
    };

    resolvePreviewUrl();

    return () => {
      isCancelled = true;
    };
  }, [cloudinaryUrl, documentId, fileType, useSignedUrl, pdfBlob]);

  useEffect(() => {
    if (pdfBlob) return; // Skip if we're rendering converted preview

    let isCancelled = false;
    let loadingTask;

    const destroyPdf = async () => {
      const existingDocument = pdfDocumentRef.current;
      pdfDocumentRef.current = null;

      if (existingDocument) {
        await existingDocument.destroy();
      }
    };

    const loadPreview = async () => {
      setError('');
      setPageNumbers([]);
      canvasRefs.current = [];

      await destroyPdf();

      if (!resolvedDocumentUrl) {
        setStatus('idle');
        return;
      }

      if (imagePreview) {
        setStatus('image-loading');
        setPageNumbers([1]);
        return;
      }

      setStatus('loading');

      try {
        loadingTask = pdfjsLib.getDocument({ url: resolvedDocumentUrl });
        const pdfDocument = await loadingTask.promise;

        if (isCancelled) {
          await pdfDocument.destroy();
          return;
        }

        pdfDocumentRef.current = pdfDocument;

        startTransition(() => {
          setPageNumbers(
            Array.from({ length: Math.min(pdfDocument.numPages, 5) }, (_, index) => index + 1)
          );
        });

        setStatus('rendering');
      } catch {
        if (!isCancelled) {
          setStatus('error');
          setError('Could not load the preview for this document.');
        }
      }
    };

    loadPreview();

    return () => {
      isCancelled = true;
      loadingTask?.destroy();
      destroyPdf();
    };
  }, [imagePreview, resolvedDocumentUrl, pdfBlob]);

  useEffect(() => {
    if (pdfBlob) return; // Skip if we're rendering converted preview
    if (imagePreview || status !== 'rendering' || !pageNumbers.length || !pdfDocumentRef.current) {
      return undefined;
    }

    let isCancelled = false;

    const renderThumbnails = async () => {
      try {
        const pdfDocument = pdfDocumentRef.current;

        for (let index = 0; index < pageNumbers.length; index += 1) {
          const pageNumber = pageNumbers[index];
          const page = await pdfDocument.getPage(pageNumber);
          const canvas = canvasRefs.current[index];

          if (isCancelled || !canvas) {
            page.cleanup();
            return;
          }

          const viewport = page.getViewport({ scale: THUMBNAIL_SCALE });
          const context = canvas.getContext('2d');

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          page.cleanup();
        }

        if (!isCancelled) {
          setStatus('ready');
        }
      } catch {
        if (!isCancelled) {
          setStatus('error');
          setError('Preview rendering failed for this document.');
        }
      }
    };

    renderThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [imagePreview, pageNumbers, status, pdfBlob]);

  // --- EFFECTS FOR NEW CONVERTED PREVIEW ---
  useEffect(() => {
    if (!pdfBlob) return;

    let isCancelled = false;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setRenderError(null);
        setPageCount(0);
        setPages([]);

        // Convert blob to ArrayBuffer for pdfjs
        const arrayBuffer = await pdfBlob.arrayBuffer();

        // Use the same pdfjs loading pattern already in the project
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;

        if (isCancelled) {
          await pdfDoc.destroy();
          return;
        }

        setPageCount(pdfDoc.numPages);

        const renderedPages = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport }).promise;

          if (isCancelled) {
            page.cleanup();
            return;
          }

          // Convert canvas to data URL for rendering in JSX
          renderedPages.push(canvas.toDataURL());
          page.cleanup();
        }

        if (!isCancelled) {
          setPages(renderedPages);
        }
      } catch (err) {
        console.error('PDF render error:', err);
        if (!isCancelled) {
          setRenderError('Could not render the PDF preview.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfBlob]);

  // --- RENDER CONVERTED PREVIEW IF pdfBlob PROVIDED ---
  if (pdfBlob) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
        <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[32px] border border-slate-200 bg-white shadow-2xl overflow-hidden">
          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">DOCUMENT PREVIEW</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Converted from {originalFileName}</h2>
              </div>
              <button
                type="button"
                onClick={onManualUpload}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Warning Banner */}
            <div
              className="rounded-2xl border p-4 text-sm leading-6"
              style={{ backgroundColor: '#FFF3CD', borderColor: '#FFC107', color: '#856404' }}
            >
              Please verify the formatting before proceeding. Complex tables, images, or special fonts may not convert perfectly. If anything looks wrong, use the option below to start over.
            </div>

            {/* Size Warning Banner */}
            {sizeWarning && (
              <div
                className="rounded-2xl border p-4 text-sm leading-6"
                style={{ backgroundColor: '#FFF5F5', borderColor: '#FF4444', color: '#FF4444' }}
              >
                This converted file ({sizeMB} MB) may exceed the upload size limit. If the upload fails after confirming, please use a smaller document.
              </div>
            )}

            {/* Loading state */}
            {isLoading && !renderError && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
                <p className="text-sm font-medium text-slate-600">Rendering preview...</p>
              </div>
            )}

            {/* Error state */}
            {renderError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 leading-6">
                {renderError}
              </div>
            )}

            {/* PDF Pages */}
            {!isLoading && !renderError && pages.length > 0 && (
              <div className="space-y-6 max-h-[50vh] overflow-y-auto p-4 border border-slate-100 rounded-2xl bg-slate-50">
                {pages.map((dataUrl, index) => (
                  <div key={index} className="flex flex-col items-center space-y-2">
                    <img
                      src={dataUrl}
                      alt={`Page ${index + 1}`}
                      className="max-w-full h-auto rounded-lg border border-slate-200 shadow-sm"
                    />
                    <p className="text-xs text-slate-500 font-medium">Page {index + 1} of {pageCount}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Info bar */}
            {!isLoading && !renderError && pageCount > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <span>Pages detected: <span className="font-semibold">{pageCount}</span></span>
                  <span>Estimated cost: <span className="font-semibold text-sky-300">₹{(pageCount * RATE_PER_PAGE).toFixed(2)}</span></span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Final cost depends on colour and sides selected in the next step</p>
              </div>
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 sm:px-8 flex flex-col sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={onManualUpload}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            {!isLoading && !renderError && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- ORIGINAL COMPONENT RENDER ---
  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_#ffffff,_#f8fbff_55%,_#eef6ff)] px-6 py-6 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Preview</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">Inspect the first pages before proceeding</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          The first five pages are shown below with visual warnings highlighted directly on the preview.
        </p>
      </div>

      <div className="space-y-5 px-6 py-6 sm:px-8">
        {!cloudinaryUrl ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            Upload a document first to unlock the preview.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error}</div>
        ) : null}

        {cloudinaryUrl && imagePreview ? (
          <div className="space-y-4">
            <div
              className={[
                'overflow-hidden rounded-[28px] border-2 bg-slate-100',
                getBorderClass(getPageBadges(1, normalizedAnalysis)),
              ].join(' ')}
            >
              <div className="flex flex-wrap gap-2 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur">
                {getPageBadges(1, normalizedAnalysis).map((badge) => (
                  <span
                    key={badge.label}
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badge.pillClass}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>

              <img
                alt="Document preview"
                className="h-auto max-h-[720px] w-full object-contain bg-slate-100"
                src={resolvedDocumentUrl}
                onError={() => {
                  setStatus('error');
                  setError('Could not load the image preview.');
                }}
                onLoad={() => setStatus('ready')}
              />
            </div>
          </div>
        ) : null}

        {cloudinaryUrl && !imagePreview ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pageNumbers.map((pageNumber, index) => {
              const badges = getPageBadges(pageNumber, normalizedAnalysis);

              return (
                <article
                  key={pageNumber}
                  className={[
                    'overflow-hidden rounded-[28px] border-2 bg-slate-50 shadow-sm',
                    getBorderClass(badges),
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Page {pageNumber}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">150 DPI thumbnail</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {badges.map((badge) => (
                        <span
                          key={`${pageNumber}-${badge.label}`}
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badge.pillClass}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[linear-gradient(180deg,_#f8fafc,_#eef2ff)] p-4">
                    <canvas
                      ref={(node) => {
                        canvasRefs.current[index] = node;
                      }}
                      className="h-auto w-full rounded-2xl bg-white shadow-[0_18px_42px_-30px_rgba(15,23,42,0.8)]"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {normalizedAnalysis.colourHeavyPages.length ? (
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm text-sky-900">
            Pages {normalizedAnalysis.colourHeavyPages.join(', ')} may consume noticeably more colour ink.
          </div>
        ) : null}

        {!isReady && cloudinaryUrl ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            {imagePreview ? 'Loading image preview...' : 'Rendering page thumbnails...'}
          </div>
        ) : null}

        {showProceedButton ? (
          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!isReady}
              type="button"
              onClick={() => onProceed?.()}
            >
              {proceedLabel}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default DocumentPreview;
