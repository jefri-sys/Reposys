import { useEffect, useState, useContext, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import WizardStep1Upload from '../../components/user/WizardStep1Upload';
import WizardStep2Configure from '../../components/user/WizardStep2Configure';
import WizardStep3Payment from '../../components/user/WizardStep3Payment';
import { AuthContext } from '../../context/AuthContextObject';
import { useFileConverter } from '../../hooks/useFileConverter';
import DocumentPreview from '../../components/DocumentPreview';
import api from '../../services/api';

const INITIAL_ORDER_CONFIG = {
  serviceType: '',
  copies: 1,
  colourMode: 'BlackAndWhite',
  sided: 'Single',
  paperSize: 'A4',
  binding: 'None',
  printInstructions: '',
  preferredPickupSlot: 'Morning',
  paymentMethod: 'Online',
  outputFormat: 'PDF',
  conversionType: 'PDF to Word',
};

const GUEST_ORDER_CONFIG = {
  ...INITIAL_ORDER_CONFIG,
  paymentMethod: 'Cash',
};

const GUEST_PAYMENT_METHODS = [
  { label: 'Pay at Counter', value: 'Cash' },
];

const STEPS = [
  { id: 1, label: 'Upload', description: 'Step 1: Upload' },
  { id: 2, label: 'Configure', description: 'Step 2: Configure' },
  { id: 3, label: 'Payment', description: 'Step 3: Payment' },
];

const normalizeUploadedDocuments = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (payload.documentId) {
    return [payload];
  }

  return [];
};

const getReorderDraftFromState = (state) => {
  const draft = state?.reorderDraft;
  return draft?.isDraft ? draft : null;
};

const buildUploadedDocumentsFromDraft = (draft) => (
  Array.isArray(draft?.uploadedDocuments) ? draft.uploadedDocuments : []
);

const getInitialOrderConfig = (isGuestMode) => (
  isGuestMode ? GUEST_ORDER_CONFIG : INITIAL_ORDER_CONFIG
);

const buildOrderConfigFromDraft = (draft, isGuestMode = false) => {
  if (!draft) {
    return getInitialOrderConfig(isGuestMode);
  }

  return {
    ...getInitialOrderConfig(isGuestMode),
    ...draft.printConfig,
    serviceType: draft.serviceType || '',
    preferredPickupSlot: draft.preferredPickupSlot || getInitialOrderConfig(isGuestMode).preferredPickupSlot,
    paymentMethod: isGuestMode ? 'Cash' : draft.paymentMethod || INITIAL_ORDER_CONFIG.paymentMethod,
  };
};

const buildCostEstimateFromDraft = (draft) => {
  if (!draft || draft.estimatedCost == null) {
    return null;
  }

  return {
    estimatedCost: draft.estimatedCost,
    breakdown: draft.breakdown || {
      total: draft.estimatedCost,
    },
  };
};

const OrderWizard = ({ isGuestMode = false, guestEmail = '', onEndGuestSession }) => {
  const location = useLocation();
  const initialDraft = getReorderDraftFromState(location.state);
  const { user } = useContext(AuthContext) || {};
  const [currentStep, setCurrentStep] = useState(initialDraft ? 3 : 1);
  const [uploadedDocuments, setUploadedDocuments] = useState(() => buildUploadedDocumentsFromDraft(initialDraft));
  const [orderConfig, setOrderConfig] = useState(() => buildOrderConfigFromDraft(initialDraft, isGuestMode));
  const [costEstimate, setCostEstimate] = useState(() => buildCostEstimateFromDraft(initialDraft));
  const [uploadKey, setUploadKey] = useState(0);
  const [reorderDraft, setReorderDraft] = useState(initialDraft);
  const [groupOrderData, setGroupOrderData] = useState({
    isGroupOrder: false,
    participants: [],
    friends: []
  });

  const { convertFile, isConverting, conversionError, reset: resetConverter } = useFileConverter();
  const [convertedFile, setConvertedFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const pendingUploadRef = useRef(null);

  // Set file input accept attribute dynamically and intercept uploads
  useEffect(() => {
    // 1. Dynamic accept update
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.setAttribute('accept', '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    }

    // 2. Intercept upload API calls
    const originalPost = api.post;

    api.post = async function (url, data, config) {
      if (url === '/documents/upload' || url === '/documents/upload-multiple') {
        let hasDocx = false;
        let docxFile = null;

        if (data instanceof FormData) {
          if (data.has('file')) {
            const file = data.get('file');
            if (file && file.name.toLowerCase().endsWith('.docx')) {
              hasDocx = true;
              docxFile = file;
            }
          } else if (data.has('files')) {
            const files = data.getAll('files');
            const docx = files.find(f => f.name.toLowerCase().endsWith('.docx'));
            if (docx) {
              hasDocx = true;
              docxFile = docx;
            }
          }
        }

        if (hasDocx && docxFile) {
          const result = await convertFile(docxFile);

          if (!result) {
            throw new Error(conversionError || 'Conversion failed. Please upload a PDF file instead.');
          }

          if (result.isConverted) {
            setConvertedFile(result.file);
            setPreviewData({
              pdfBlob: result.file,
              originalFileName: docxFile.name,
              sizeWarning: result.sizeWarning,
              sizeMB: result.sizeMB
            });
            setShowPreview(true);

            return new Promise((resolve, reject) => {
              pendingUploadRef.current = {
                resolve: async () => {
                  try {
                    const newFormData = new FormData();
                    for (const [key, value] of data.entries()) {
                      if (key === 'file' && value.name?.toLowerCase().endsWith('.docx')) {
                        newFormData.append('file', result.file, docxFile.name.replace(/\.docx$/i, '.pdf'));
                      } else if (key === 'files') {
                        if (value instanceof File && value.name?.toLowerCase().endsWith('.docx')) {
                          newFormData.append('files', result.file, value.name.replace(/\.docx$/i, '.pdf'));
                        } else {
                          newFormData.append('files', value);
                        }
                      } else {
                        newFormData.append(key, value);
                      }
                    }
                    const response = await originalPost.call(api, url, newFormData, config);
                    resolve(response);
                  } catch (err) {
                    reject(err);
                  }
                },
                reject: () => {
                  reject(new Error('Upload cancelled.'));
                }
              };
            });
          }
        }
      }

      return originalPost.call(api, url, data, config);
    };

    return () => {
      api.post = originalPost;
    };
  }, [convertFile, conversionError, currentStep]);

  // Reset converter state when uploader resets or components change
  useEffect(() => {
    resetConverter();
    setConvertedFile(null);
    setShowPreview(false);
    setPreviewData(null);
  }, [uploadKey]);

  useEffect(() => {
    return () => {
      resetConverter();
      setConvertedFile(null);
      setShowPreview(false);
      setPreviewData(null);
    };
  }, []);

  const handlePreviewConfirm = () => {
    setShowPreview(false);
    if (pendingUploadRef.current) {
      pendingUploadRef.current.resolve();
      pendingUploadRef.current = null;
    }
  };

  const handleManualUpload = () => {
    setShowPreview(false);
    setPreviewData(null);
    setConvertedFile(null);
    resetConverter();
    if (pendingUploadRef.current) {
      pendingUploadRef.current.reject();
      pendingUploadRef.current = null;
    }
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.setAttribute('accept', '.pdf,application/pdf');
      fileInput.click();
      setTimeout(() => {
        fileInput.setAttribute('accept', '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }, 1000);
    }
  };

  const isStudentOrFaculty = user && ['Student', 'Faculty', 'student', 'faculty'].includes(user.role);

  const steps = isStudentOrFaculty ? [
    { id: 1, label: 'Upload', description: 'Step 1: Upload' },
    { id: 2, label: 'Configure', description: 'Step 2: Configure' },
    { id: 3, label: 'Payment', description: 'Step 3: Payment' },
    { id: 4, label: 'Group Split', description: 'Step 4: Group Split' }
  ] : [
    { id: 1, label: 'Upload', description: 'Step 1: Upload' },
    { id: 2, label: 'Configure', description: 'Step 2: Configure' },
    { id: 3, label: 'Payment', description: 'Step 3: Payment' }
  ];

  useEffect(() => {
    const nextDraft = getReorderDraftFromState(location.state);

    if (!nextDraft) {
      return;
    }

    setReorderDraft(nextDraft);
    setUploadedDocuments(buildUploadedDocumentsFromDraft(nextDraft));
    setOrderConfig(buildOrderConfigFromDraft(nextDraft, isGuestMode));
    setCostEstimate(buildCostEstimateFromDraft(nextDraft));
    setCurrentStep(3);
    setUploadKey((value) => value + 1);
  }, [isGuestMode, location.state]);

  const handleAnalysisComplete = (payload) => {
    const incomingDocuments = normalizeUploadedDocuments(payload);

    if (!incomingDocuments.length) {
      return;
    }

    setUploadedDocuments((currentDocuments) => {
      const existingIds = new Set(currentDocuments.map((document) => document.documentId));
      const mergedDocuments = [...currentDocuments];

      incomingDocuments.forEach((document) => {
        if (!existingIds.has(document.documentId) && mergedDocuments.length < 10) {
          mergedDocuments.push(document);
          existingIds.add(document.documentId);
        }
      });

      return mergedDocuments;
    });
    setUploadKey((value) => value + 1);
  };

  const handleRemoveDocument = (documentId) => {
    setUploadedDocuments((currentDocuments) => (
      currentDocuments.filter((document) => document.documentId !== documentId)
    ));
  };

  const handleConfigChange = (patch) => {
    setOrderConfig((currentConfig) => ({
      ...currentConfig,
      ...patch,
    }));
  };

  // Effect to guard and update the Next button status dynamically during conversion
  useEffect(() => {
    const nextBtn = Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent.includes('Next') || btn.textContent.includes('Converting')
    );
    if (nextBtn) {
      if (isConverting) {
        if (!nextBtn.disabled) {
          nextBtn.disabled = true;
          nextBtn.setAttribute('data-orig-text', nextBtn.textContent);
          nextBtn.textContent = 'Converting...';
        }
      } else {
        const origText = nextBtn.getAttribute('data-orig-text');
        if (origText) {
          nextBtn.disabled = uploadedDocuments.length === 0;
          nextBtn.textContent = origText;
          nextBtn.removeAttribute('data-orig-text');
        }
      }
    }
  }, [isConverting, uploadedDocuments.length]);

  const renderActiveStep = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <WizardStep1Upload
            uploadedDocuments={uploadedDocuments}
            uploadKey={uploadKey}
            isGuestMode={isGuestMode}
            onAnalysisComplete={handleAnalysisComplete}
            onNext={() => {
              if (isConverting || showPreview) return;
              setCurrentStep(2);
            }}
            onRemoveDocument={handleRemoveDocument}
            onResetUploader={() => setUploadKey((value) => value + 1)}
          />
          {isConverting && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-sky-600" />
              <span>Converting your document — please wait...</span>
            </div>
          )}
          {conversionError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <p className="font-semibold">{conversionError}</p>
              <p className="mt-1 text-xs text-rose-600">Please upload a PDF file instead.</p>
            </div>
          )}
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <WizardStep2Configure
          costEstimate={costEstimate}
          isGuestMode={isGuestMode}
          orderConfig={orderConfig}
          paymentMethods={isGuestMode ? GUEST_PAYMENT_METHODS : undefined}
          uploadedDocuments={uploadedDocuments}
          onBack={() => setCurrentStep(reorderDraft ? 3 : 1)}
          onConfigChange={handleConfigChange}
          onCostEstimateChange={setCostEstimate}
          onNext={() => setCurrentStep(3)}
        />
      );
    }

    if (currentStep === 3) {
      return (
        <WizardStep3Payment
          costEstimate={costEstimate}
          isGuestMode={isGuestMode}
          orderConfig={orderConfig}
          uploadedDocuments={uploadedDocuments}
          onBack={() => setCurrentStep(2)}
          onNext={isStudentOrFaculty ? () => setCurrentStep(4) : undefined}
          groupOrderData={groupOrderData}
          setGroupOrderData={setGroupOrderData}
        />
      );
    }

    return (
      <WizardStep3Payment
        costEstimate={costEstimate}
        isGuestMode={isGuestMode}
        orderConfig={orderConfig}
        uploadedDocuments={uploadedDocuments}
        onBack={() => setCurrentStep(3)}
        isGroupStep={true}
        groupOrderData={groupOrderData}
        setGroupOrderData={setGroupOrderData}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff,_#eef4ff_52%,_#f8fafc)] text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
        <div className="rounded-[40px] border border-slate-200 bg-white shadow-[0_30px_120px_-60px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(135deg,_#e0f2fe,_#ffffff_58%)] px-6 py-8 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
                  {isGuestMode ? 'Guest Kiosk' : 'Order Wizard'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    to={isGuestMode ? '/' : '/dashboard'}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                  >
                    {isGuestMode ? 'Back to Home' : 'Back to Dashboard'}
                  </Link>
                  {isGuestMode ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/90 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                      type="button"
                      onClick={onEndGuestSession}
                    >
                      End Guest Session
                    </button>
                  ) : null}
                </div>
                {isGuestMode && (
                  <>
                    <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                      Guest print order kiosk
                    </h1>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                      Upload documents, configure the service, and submit a pay-at-counter order from this OTP-verified walk-in session.
                    </p>
                  </>
                )}
                {isGuestMode && guestEmail ? (
                  <p className="mt-3 text-sm font-medium text-slate-600">Session email: {guestEmail}</p>
                ) : null}
              </div>
            </div>

            <div className={`mt-8 grid gap-3 ${steps.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              {steps.map((step) => {
                const isActive = currentStep === step.id;
                const isComplete = currentStep > step.id;

                return (
                  <div
                    key={step.id}
                    className={[
                      'rounded-[28px] border px-5 py-4 transition',
                      isActive
                        ? 'border-sky-500 bg-sky-50'
                        : isComplete
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-white/70 bg-white/70',
                    ].join(' ')}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{step.description}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className={[
                          'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold',
                          isActive
                            ? 'bg-sky-600 text-white'
                            : isComplete
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700',
                        ].join(' ')}
                      >
                        {step.id}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-950">{step.label}</p>
                        <p className="text-sm text-slate-600">
                          {step.id === 1
                            ? 'Add analysed files'
                            : step.id === 2
                              ? 'Set service options'
                              : step.id === 3
                                ? 'Review and confirm'
                                : 'Split with friends'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-6 pt-8 pb-40 sm:px-8 lg:px-10 md:pb-8">
            {reorderDraft ? (
              <div className="mb-6 rounded-[28px] border border-amber-200 bg-[linear-gradient(135deg,_#fff7ed,_#ffffff)] px-5 py-4 text-sm text-amber-900 shadow-sm">
                <p className="font-semibold">Reordering {reorderDraft.originalTokenNumber} - review and confirm below</p>
                <p className="mt-1 text-amber-800">
                  The pricing shown here has been recalculated using the current Reposys rates.
                </p>
              </div>
            ) : null}

            {renderActiveStep()}
          </div>
        </div>
      </div>
      {showPreview && previewData && (
        <DocumentPreview
          pdfBlob={previewData.pdfBlob}
          originalFileName={previewData.originalFileName}
          sizeWarning={previewData.sizeWarning}
          sizeMB={previewData.sizeMB}
          onConfirm={handlePreviewConfirm}
          onManualUpload={handleManualUpload}
          confirmLabel="Looks good — Continue"
          cancelLabel="Upload PDF manually instead"
        />
      )}
    </div>
  );
};

export default OrderWizard;
