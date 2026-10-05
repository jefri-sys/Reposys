import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import api from '../../services/api';
import DocumentPreview from '../DocumentPreview';
import DocumentAnalysisSummary from './DocumentAnalysisSummary';
import { openUploadedDocumentInNewTab } from '../../utils/documentAccess';

const SERVICE_TYPES = ['Printing', 'Photocopying', 'Scanning', 'Binding'];
const PAYMENT_METHODS = [
  { label: 'Online Payment', value: 'Online' },
  { label: 'Pay at Counter', value: 'Cash' },
];
const PICKUP_SLOTS = [
  { label: 'Morning (9-11am)', value: 'Morning' },
  { label: 'Afternoon (12-2pm)', value: 'Afternoon' },
  { label: 'Evening (3-5pm)', value: 'Evening' },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const getServiceDescription = (serviceType) => {
  if (serviceType === 'Printing') {
    return 'Full print setup with paper, colour, sides, and optional binding.';
  }

  if (serviceType === 'Photocopying') {
    return 'Copy settings with the same core options as a print order.';
  }

  if (serviceType === 'Scanning') {
    return 'Fast scan pricing based on total page count.';
  }

  if (serviceType === 'Binding') {
    return 'Binding-only service priced per document set.';
  }

  return 'Document format conversion currently carries no extra charge.';
};

const renderEstimateRows = (serviceType, breakdown, documentCount) => {
  if (!breakdown) {
    return [];
  }

  if (serviceType === 'Binding') {
    const rows = [
      { label: 'Base rate', value: CURRENCY_FORMATTER.format(breakdown.baseRate || 0) },
      { label: 'Pages', value: breakdown.pages || 0 },
      { label: 'Copies', value: breakdown.copies || 0 },
      { label: 'Binding charge', value: CURRENCY_FORMATTER.format(breakdown.bindingCharge || 0) },
    ];

    if (breakdown.doubleSidedDiscount > 0) {
      rows.splice(3, 0, {
        label: 'Double-sided discount',
        value: `- ${CURRENCY_FORMATTER.format(breakdown.doubleSidedDiscount || 0)}`,
      });
    }

    return rows;
  }

  if (serviceType === 'Conversion') {
    return [
      { label: 'Rate per document', value: CURRENCY_FORMATTER.format(breakdown.baseRate || 0) },
      { label: 'Documents', value: documentCount || 0 },
    ];
  }

  if (serviceType === 'Scanning') {
    return [
      { label: 'Rate per page', value: CURRENCY_FORMATTER.format(breakdown.baseRate || 0) },
      { label: 'Pages', value: breakdown.pages || 0 },
    ];
  }

  const rows = [
    { label: 'Base rate', value: CURRENCY_FORMATTER.format(breakdown.baseRate || 0) },
    { label: 'Pages', value: breakdown.pages || 0 },
    { label: 'Copies', value: breakdown.copies || 0 },
    { label: 'Binding charge', value: CURRENCY_FORMATTER.format(breakdown.bindingCharge || 0) },
  ];

  if (breakdown.doubleSidedDiscount > 0) {
    rows.splice(3, 0, {
      label: 'Double-sided discount',
      value: `- ${CURRENCY_FORMATTER.format(breakdown.doubleSidedDiscount || 0)}`,
    });
  }

  return rows;
};

const getServiceTypePatch = (serviceType, currentConfig) => {
  if (serviceType === 'Binding') {
    return {
      serviceType,
      binding: currentConfig.binding && currentConfig.binding !== 'None' ? currentConfig.binding : 'Spiral',
      copies: 1,
    };
  }

  if (serviceType === 'Scanning') {
    return {
      serviceType,
      binding: 'None',
      copies: 1,
      colourMode: currentConfig.colourMode === 'Colour' ? 'Colour' : 'BlackAndWhite',
    };
  }

  if (serviceType === 'Conversion') {
    return {
      serviceType,
      binding: 'None',
      copies: 1,
      conversionType: currentConfig.conversionType || 'PDF to Word',
    };
  }

  return {
    serviceType,
    binding: serviceType === 'Photocopying' ? 'None' : currentConfig.binding,
  };
};

const WizardStep2Configure = ({
  uploadedDocuments,
  orderConfig,
  onConfigChange,
  onBack,
  onNext,
  costEstimate,
  onCostEstimateChange,
  isGuestMode = false,
  paymentMethods = PAYMENT_METHODS,
  hideNavigation = false,
}) => {
  const totalPages = uploadedDocuments.reduce((sum, document) => sum + (document.pageCount || 0), 0);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState('');
  const [selectedPreviewId, setSelectedPreviewId] = useState(uploadedDocuments[0]?.documentId || '');
  const [openingDocumentId, setOpeningDocumentId] = useState('');
  const [documentActionError, setDocumentActionError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!isGuestMode) {
      api.get('/wallet').then((res) => {
        if (res.data?.success) {
          setWalletBalance(res.data.balance || 0);
        }
      }).catch(() => {
        setWalletBalance(0);
      });
    }
  }, [isGuestMode]);

  useEffect(() => {
    if (!uploadedDocuments.length) {
      setSelectedPreviewId('');
      return;
    }

    const hasSelectedDocument = uploadedDocuments.some((document) => document.documentId === selectedPreviewId);

    if (!hasSelectedDocument) {
      setSelectedPreviewId(uploadedDocuments[0].documentId);
    }
  }, [selectedPreviewId, uploadedDocuments]);

  useEffect(() => {
    if (!orderConfig.serviceType) {
      onCostEstimateChange(null);
      setEstimateError('');
      setIsEstimating(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsEstimating(true);
      setEstimateError('');

      try {
        const response = await api.post('/orders/estimate', {
          serviceType: orderConfig.serviceType,
          pageCount: totalPages,
          copies: orderConfig.copies,
          colourMode: orderConfig.colourMode,
          sided: orderConfig.sided,
          binding: orderConfig.binding,
          documentCount: uploadedDocuments.length,
        });

        onCostEstimateChange(response.data);
      } catch (error) {
        onCostEstimateChange(null);
        setEstimateError(error.response?.data?.message || 'Could not calculate a live estimate right now.');
      } finally {
        setIsEstimating(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    onCostEstimateChange,
    orderConfig.binding,
    orderConfig.colourMode,
    orderConfig.copies,
    orderConfig.serviceType,
    orderConfig.sided,
    totalPages,
    uploadedDocuments.length,
  ]);

  const showPrintControls = orderConfig.serviceType === 'Printing' || orderConfig.serviceType === 'Photocopying';
  const showBindingOnlyControls = orderConfig.serviceType === 'Binding';
  const showScanningControls = orderConfig.serviceType === 'Scanning';
  const showConversionControls = orderConfig.serviceType === 'Conversion';
  const estimateRows = renderEstimateRows(orderConfig.serviceType, costEstimate?.breakdown, uploadedDocuments.length);
  const selectedPreviewDocument = uploadedDocuments.find((document) => document.documentId === selectedPreviewId) || null;

  const currentPaymentMethods = isGuestMode ? paymentMethods : [
    ...paymentMethods,
    { label: `Pay via Wallet (Balance: ₹${walletBalance})`, value: 'wallet' }
  ];

  return (
    <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Step 2</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Configure the job</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Pricing updates as you change the service details so the user sees the expected cost before checkout.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              Total pages: {totalPages}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Service Type</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SERVICE_TYPES.map((serviceType) => {
              const active = orderConfig.serviceType === serviceType;

              return (
                <button
                  key={serviceType}
                  className={[
                    'rounded-3xl border px-4 py-4 text-left transition',
                    active
                      ? 'border-sky-500 bg-sky-50 shadow-[0_16px_40px_-28px_rgba(14,116,144,0.45)]'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white',
                  ].join(' ')}
                  type="button"
                  onClick={() => onConfigChange(getServiceTypePatch(serviceType, orderConfig))}
                >
                  <p className="text-sm font-semibold text-slate-950">{serviceType}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{getServiceDescription(serviceType)}</p>
                </button>
              );
            })}
          </div>
        </div>

        {showPrintControls ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Print Options</p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Copies</span>
                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  max="99"
                  min="1"
                  type="number"
                  value={orderConfig.copies}
                  onChange={(event) => onConfigChange({ copies: Number(event.target.value) || 1 })}
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Paper Size</span>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  value={orderConfig.paperSize}
                  onChange={(event) => onConfigChange({ paperSize: event.target.value })}
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Letter">Letter</option>
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Colour Mode</p>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  {['BlackAndWhite', 'Colour'].map((option) => (
                    <button
                      key={option}
                      className={[
                        'rounded-xl px-3 py-2 text-sm font-medium transition',
                        orderConfig.colourMode === option
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900',
                      ].join(' ')}
                      type="button"
                      onClick={() => onConfigChange({ colourMode: option })}
                    >
                      {option === 'BlackAndWhite' ? 'Black & White' : 'Colour'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Sides</p>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  {['Single', 'Double'].map((option) => (
                    <button
                      key={option}
                      className={[
                        'rounded-xl px-3 py-2 text-sm font-medium transition',
                        orderConfig.sided === option
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900',
                      ].join(' ')}
                      type="button"
                      onClick={() => onConfigChange({ sided: option })}
                    >
                      {option === 'Single' ? 'Single-sided' : 'Double-sided'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Binding</span>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  value={orderConfig.binding}
                  onChange={(event) => onConfigChange({ binding: event.target.value })}
                >
                  <option value="None">None</option>
                  <option value="Spiral">Spiral</option>
                  <option value="Staple">Staple</option>
                </select>
              </label>
            </div>

            <label className="mt-5 block space-y-2 text-sm font-medium text-slate-700">
              <span>Print Instructions</span>
              <textarea
                className="min-h-32 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                maxLength={500}
                placeholder="Optional notes for page range, margin, or finishing preferences."
                value={orderConfig.printInstructions}
                onChange={(event) => onConfigChange({ printInstructions: event.target.value })}
              />
            </label>
          </div>
        ) : null}

        {showBindingOnlyControls ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Binding Options</p>
            <label className="mt-5 block space-y-2 text-sm font-medium text-slate-700">
              <span>Binding Type</span>
              <select
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                value={orderConfig.binding}
                onChange={(event) => onConfigChange({ binding: event.target.value })}
              >
                <option value="Spiral">Spiral</option>
                <option value="Staple">Staple</option>
              </select>
            </label>
            <label className="mt-5 block space-y-2 text-sm font-medium text-slate-700">
              <span>Binding Instructions</span>
              <textarea
                className="min-h-32 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                maxLength={500}
                placeholder="Optional notes for cover preferences, set grouping, or finishing instructions."
                value={orderConfig.printInstructions}
                onChange={(event) => onConfigChange({ printInstructions: event.target.value })}
              />
            </label>
          </div>
        ) : null}

        {showScanningControls ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Scanning Options</p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Output Format</span>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  value={orderConfig.outputFormat}
                  onChange={(event) => onConfigChange({ outputFormat: event.target.value })}
                >
                  <option value="PDF">PDF</option>
                  <option value="JPG">JPG</option>
                  <option value="PNG">PNG</option>
                </select>
              </label>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Scan Mode</p>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  {[
                    { label: 'Colour', value: 'Colour' },
                    { label: 'Grayscale', value: 'BlackAndWhite' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      className={[
                        'rounded-xl px-3 py-2 text-sm font-medium transition',
                        orderConfig.colourMode === option.value
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900',
                      ].join(' ')}
                      type="button"
                      onClick={() => onConfigChange({ colourMode: option.value })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showConversionControls ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Conversion Options</p>
            <label className="mt-5 block space-y-2 text-sm font-medium text-slate-700">
              <span>Conversion Type</span>
              <select
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                value={orderConfig.conversionType}
                onChange={(event) => onConfigChange({ conversionType: event.target.value })}
              >
                <option value="PDF to Word">PDF to Word</option>
                <option value="Word to PDF">Word to PDF</option>
                <option value="Image to PDF">Image to PDF</option>
              </select>
            </label>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The selected conversion type applies to each uploaded document in this order.
            </p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Pickup Slot</p>
            <div className="mt-4 space-y-3">
              {PICKUP_SLOTS.map((slot) => (
                <label
                  key={slot.value}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300"
                >
                  <input
                    checked={orderConfig.preferredPickupSlot === slot.value}
                    className="h-4 w-4 accent-sky-600"
                    name="preferredPickupSlot"
                    type="radio"
                    value={slot.value}
                    onChange={(event) => onConfigChange({ preferredPickupSlot: event.target.value })}
                  />
                  <span>{slot.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Payment Method</p>
            <div className="mt-4 space-y-3">
              {currentPaymentMethods.map((method) => (
                <label
                  key={method.value}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300"
                >
                  <input
                    checked={orderConfig.paymentMethod === method.value}
                    className="h-4 w-4 accent-sky-600"
                    name="paymentMethod"
                    type="radio"
                    value={method.value}
                    onChange={(event) => onConfigChange({ paymentMethod: event.target.value })}
                  />
                  <span>{method.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm flex items-start gap-3 mt-6">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 leading-relaxed">
            <p className="font-bold mb-1">⚠️ Cancellation Notice</p>
            <p>Orders can only be cancelled within 1 minute of placement. After that, cancellation is unavailable.</p>
            <p className="mt-1.5 font-medium">For Cash on Delivery/Pay at Counter orders, payment must be completed at the counter before processing begins.</p>
          </div>
        </div>

      </div>

      <aside className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Document Checks</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              {uploadedDocuments.length} doc{uploadedDocuments.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="mt-5 space-y-4">
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-950">
                      {index + 1}. {document.originalFilename}
                    </p>
                    <div className="mt-4">
                      <DocumentAnalysisSummary compact document={document} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
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
                            setDocumentActionError('');
                            setOpeningDocumentId(document.documentId);
                            await openUploadedDocumentInNewTab(document);
                          } catch (error) {
                            setDocumentActionError(error.response?.data?.message || 'Could not open the uploaded file.');
                          } finally {
                            setOpeningDocumentId('');
                          }
                        }}
                      >
                        {openingDocumentId === document.documentId ? 'Opening...' : 'Open File'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {documentActionError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {documentActionError}
            </div>
          ) : null}

          {selectedPreviewDocument ? (
            <div className="mt-5">
              <DocumentPreview
                analysisResults={selectedPreviewDocument}
                cloudinaryUrl={selectedPreviewDocument.cloudinaryUrl}
                documentId={selectedPreviewDocument.documentId}
                fileType={selectedPreviewDocument.fileType}
                showProceedButton={false}
                useSignedUrl={!isGuestMode}
              />
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Live Estimate</p>
          <h3 className="mt-3 text-2xl font-semibold">
            {costEstimate?.estimatedCost != null
              ? CURRENCY_FORMATTER.format(costEstimate.estimatedCost)
              : '--'}
          </h3>

          {isEstimating ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              Recalculating estimate...
            </div>
          ) : null}

          {estimateError ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {estimateError}
            </div>
          ) : null}

          {costEstimate?.breakdown ? (
            <div className="mt-5 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
              {estimateRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4">
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3 font-semibold text-white">
                <span>Total</span>
                <span>{CURRENCY_FORMATTER.format(costEstimate.breakdown.total || 0)}</span>
              </div>
            </div>
          ) : null}
        </div>

        {!hideNavigation && (
          <div className="rounded-none md:rounded-[28px] border-t md:border border-slate-200 bg-white p-4 md:p-6 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] md:shadow-sm fixed bottom-0 left-0 w-full md:relative md:w-auto z-40 safe-pb">
            <p className="hidden md:block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Navigation</p>
            <div className="mt-2 md:mt-5 grid grid-cols-2 md:grid-cols-1 gap-3">
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-4 md:py-3 text-[15px] md:text-sm font-bold md:font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                type="button"
                onClick={onBack}
              >
                Back
              </button>
              <button
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-4 md:py-3 text-[15px] md:text-sm font-bold md:font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!orderConfig.serviceType}
                type="button"
                onClick={onNext}
              >
                Next: Review
              </button>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
};

export default WizardStep2Configure;
