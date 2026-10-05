import { useEffect, useRef, useState } from 'react';
import DocumentPreview from '../DocumentPreview';
import DocumentUpload from '../DocumentUpload';
import DocumentAnalysisSummary from './DocumentAnalysisSummary';
import { openUploadedDocumentInNewTab } from '../../utils/documentAccess';

const formatDocumentCountLabel = (count) => `${count} document${count === 1 ? '' : 's'}`;

const WizardStep1Upload = ({
  uploadedDocuments,
  onAnalysisComplete,
  onRemoveDocument,
  onNext,
  uploadKey,
  onResetUploader,
  isGuestMode = false,
  hideNavigation = false,
}) => {
  const remainingSlots = Math.max(0, 10 - uploadedDocuments.length);
  const [selectedPreviewId, setSelectedPreviewId] = useState('');
  const [actionError, setActionError] = useState('');
  const [openingDocumentId, setOpeningDocumentId] = useState('');
  const previousDocumentCountRef = useRef(0);

  useEffect(() => {
    if (!uploadedDocuments.length) {
      setSelectedPreviewId('');
      previousDocumentCountRef.current = 0;
      return;
    }

    const previousCount = previousDocumentCountRef.current;
    const hasSelectedDocument = uploadedDocuments.some((document) => document.documentId === selectedPreviewId);

    if (uploadedDocuments.length > previousCount) {
      setSelectedPreviewId(uploadedDocuments[uploadedDocuments.length - 1].documentId);
    } else if (!hasSelectedDocument) {
      setSelectedPreviewId(uploadedDocuments[0].documentId);
    }

    previousDocumentCountRef.current = uploadedDocuments.length;
  }, [selectedPreviewId, uploadedDocuments]);

  const selectedPreviewDocument = uploadedDocuments.find((document) => document.documentId === selectedPreviewId) || null;

  return (
    <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Step 1</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Upload source documents</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Add up to 10 files for this order. Each upload is analysed so Step 2 can calculate pricing from the
                actual page counts.
              </p>
            </div>
            {uploadedDocuments.length > 0 && remainingSlots > 0 ? (
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                type="button"
                onClick={onResetUploader}
              >
                Add Another Document
              </button>
            ) : null}
          </div>
        </div>

        {remainingSlots > 0 ? (
          <DocumentUpload
            key={uploadKey}
            multiple
            allowOpenUploadedFile={!isGuestMode}
            onAnalysisComplete={onAnalysisComplete}
          />
        ) : (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            You have reached the 10-document limit for a single order. Remove a file to add another one.
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Current Basket</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Uploaded documents</h3>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              {formatDocumentCountLabel(uploadedDocuments.length)}
            </div>
          </div>

          {uploadedDocuments.length ? (
            <div className="mt-5 space-y-3">
              {uploadedDocuments.map((document, index) => (
                <div
                  key={document.documentId}
                  className={[
                    'rounded-3xl border px-4 py-4 transition',
                    selectedPreviewId === document.documentId
                      ? 'border-sky-300 bg-sky-50'
                      : 'border-slate-200 bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-950">
                        {index + 1}. {document.originalFilename}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">Analysis-ready document in the current basket.</p>
                      <div className="mt-4">
                        <DocumentAnalysisSummary compact document={document} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        className="rounded-full border border-sky-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 transition hover:bg-sky-100"
                        type="button"
                        onClick={() => setSelectedPreviewId(document.documentId)}
                      >
                        Preview
                      </button>
                      {!isGuestMode ? (
                        <button
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-white"
                          type="button"
                          onClick={async () => {
                            try {
                              setActionError('');
                              setOpeningDocumentId(document.documentId);
                              await openUploadedDocumentInNewTab(document);
                            } catch (error) {
                              setActionError(error.response?.data?.message || 'Could not open the uploaded file.');
                            } finally {
                              setOpeningDocumentId('');
                            }
                          }}
                        >
                          {openingDocumentId === document.documentId ? 'Opening...' : 'Open File'}
                        </button>
                      ) : null}
                      <button
                        className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 transition hover:bg-rose-50"
                        type="button"
                        onClick={() => onRemoveDocument(document.documentId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No documents uploaded yet. Start with the uploader on the left.
            </div>
          )}
        </div>

        {actionError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        {selectedPreviewDocument ? (
          <DocumentPreview
            analysisResults={selectedPreviewDocument}
            cloudinaryUrl={selectedPreviewDocument.cloudinaryUrl}
            documentId={selectedPreviewDocument.documentId}
            fileType={selectedPreviewDocument.fileType}
            showProceedButton={false}
            useSignedUrl
          />
        ) : null}

        {!hideNavigation && (
          <div className="rounded-none md:rounded-[28px] border-t md:border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.3)] md:shadow-sm fixed bottom-0 left-0 w-full md:relative md:w-auto z-40 safe-pb">
            <div className="hidden md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Ready Check</p>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Continue once at least one analysed document is present. You can still come back and adjust the upload set
                before placing the order.
              </p>
            </div>
            <button
              className="mt-2 md:mt-6 inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-5 py-4 md:py-3 text-[15px] md:text-sm font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 shadow-md"
              disabled={uploadedDocuments.length === 0}
              type="button"
              onClick={onNext}
            >
              Next: Configure
            </button>
          </div>
        )}
      </aside>
    </section>
  );
};

export default WizardStep1Upload;
