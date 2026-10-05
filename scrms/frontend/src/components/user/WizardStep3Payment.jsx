import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DocumentPreview from '../DocumentPreview';
import DocumentAnalysisSummary from './DocumentAnalysisSummary';
import { openUploadedDocumentInNewTab } from '../../utils/documentAccess';
import { AuthContext } from '../../context/AuthContextObject';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const formatPaymentMethod = (paymentMethod) => {
  if (paymentMethod === 'Cash') return 'Pay at Counter';
  if (paymentMethod === 'wallet') return 'Pay via Wallet';
  return 'Online Payment';
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

const WizardStep3Payment = ({
  uploadedDocuments,
  orderConfig,
  costEstimate,
  onBack,
  isGuestMode = false,
  onNext,
  isGroupStep = false,
  groupOrderData,
  setGroupOrderData,
  hideNavigation = false,
  submitRef,
}) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedPreviewId, setSelectedPreviewId] = useState(uploadedDocuments[0]?.documentId || '');
  const [openingDocumentId, setOpeningDocumentId] = useState('');
  const [documentActionError, setDocumentActionError] = useState('');
  const { user } = useContext(AuthContext) || {};
  const estimateRows = renderEstimateRows(orderConfig.serviceType, costEstimate?.breakdown, uploadedDocuments.length);

  // Group Split States & Helpers
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState('');

  const fetchFriends = async () => {
    try {
      setFriendsLoading(true);
      setFriendsError('');
      const res = await api.get('/friends');
      setGroupOrderData((prev) => ({
        ...prev,
        friends: res.data || []
      }));
    } catch (err) {
      setFriendsError('Failed to fetch friends list.');
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleToggleGroup = (e) => {
    const checked = e.target.checked;
    setGroupOrderData((prev) => ({
      ...prev,
      isGroupOrder: checked,
      participants: [] // Clear selections when toggled off
    }));
    if (checked && (!groupOrderData?.friends || groupOrderData.friends.length === 0)) {
      fetchFriends();
    }
  };

  const handleFriendCheckbox = (friendId, checked) => {
    setGroupOrderData((prev) => {
      let nextParticipants;
      if (checked) {
        nextParticipants = [...(prev.participants || []), { userId: friendId, amount: 0 }];
      } else {
        nextParticipants = (prev.participants || []).filter((p) => p.userId !== friendId);
      }

      const count = nextParticipants.length;
      if (count > 0) {
        const defaultAmount = Number((orderTotal / (count + 1)).toFixed(2)) || 0;
        nextParticipants = nextParticipants.map(p => ({
          ...p,
          amount: defaultAmount
        }));
      }

      return {
        ...prev,
        participants: nextParticipants
      };
    });
  };

  const handleFriendAmount = (friendId, val) => {
    setGroupOrderData((prev) => ({
      ...prev,
      participants: (prev.participants || []).map((p) => {
        if (p.userId === friendId) {
          return { ...p, amount: val };
        }
        return p;
      })
    }));
  };

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

  const createOrderPayload = () => {
    const payload = {
      documentIds: uploadedDocuments.map((document) => document.documentId),
      serviceType: orderConfig.serviceType,
      printConfig: {
        copies: orderConfig.copies,
        colourMode: orderConfig.colourMode,
        sided: orderConfig.sided,
        paperSize: orderConfig.paperSize,
        binding: orderConfig.binding,
        printInstructions: orderConfig.printInstructions,
        outputFormat: orderConfig.outputFormat,
        conversionType: orderConfig.conversionType,
      },
      preferredPickupSlot: orderConfig.preferredPickupSlot,
      paymentMethod: orderConfig.paymentMethod,
    };

    if (groupOrderData?.isGroupOrder && Array.isArray(groupOrderData?.participants) && groupOrderData.participants.length > 0) {
      payload.isGroupOrder = true;
      payload.participants = groupOrderData.participants.map(p => ({
        userId: p.userId,
        amount: Number(p.amount) || 0
      }));
    }

    return payload;
  };

  const handleOnlinePayment = async () => {
    const orderResponse = await api.post('/orders/create', createOrderPayload());
    const createdOrder = orderResponse.data?.order;
    const orderId = createdOrder?._id;

    if (!orderId) {
      throw new Error('Order creation did not return an order id.');
    }

    try {
      // Step 1: Create Razorpay order
      const orderRes = await api.post('/payments/create-order', { orderId });
      const { razorpayOrderId, amount, currency, keyId } = orderRes.data;

      // Step 2: Open Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'Reposys — Saintgits College',
        description: 'Order ' + createdOrder.tokenNumber,
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            // Step 3: Verify payment on backend
            const verifyRes = await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: createdOrder._id
            });

            if (verifyRes.data.success) {
              navigate('/orders/confirmation/' + createdOrder._id);
              return;
            }

            setError('Payment could not be verified. Please check My Orders before retrying.');
          } catch (verifyError) {
            setError(
              verifyError.response?.data?.message
              || 'Payment could not be verified. Please check My Orders before retrying.'
            );
          } finally {
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: { color: '#1e40af' },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setError('Payment cancelled. You can retry or choose Pay at Counter.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError('Payment failed: ' + response.error.description);
        setIsSubmitting(false);
      });
      rzp.open();
    } catch (error) {
      setError('Could not initiate payment. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCashPayment = async () => {
    const orderResponse = await api.post('/orders/create', createOrderPayload());
    const { order: createdOrder, qrCodeDataUrl, trackingUrl } = orderResponse.data || {};
    const orderId = createdOrder?._id;

    if (!orderId) {
      throw new Error('Order creation did not return an order id.');
    }

    navigate(isGuestMode ? `/guest/confirmation/${orderId}` : `/orders/confirmation/${orderId}`, {
      state: { order: createdOrder, qrCodeDataUrl, trackingUrl },
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (orderConfig.paymentMethod === 'Online') {
        if (isGuestMode) {
          throw new Error('Guest kiosk orders must use pay at counter.');
        }

        await handleOnlinePayment();
      } else {
        await handleCashPayment();
      }
    } catch (submissionError) {
      setError(submissionError.response?.data?.message || submissionError.message || 'Could not complete the order.');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (submitRef) {
      submitRef.current = handleSubmit;
    }
  }, [submitRef, orderConfig.paymentMethod, isGuestMode, createOrderPayload]); // We omit handleOnlinePayment/handleCashPayment to avoid loops, but ideally we'd wrap in useCallback


  const showPrintFields = orderConfig.serviceType === 'Printing' || orderConfig.serviceType === 'Photocopying';
  const showBindingFields = orderConfig.serviceType === 'Binding';
  const showScanningFields = orderConfig.serviceType === 'Scanning';
  const showConversionFields = orderConfig.serviceType === 'Conversion';
  const selectedPreviewDocument = uploadedDocuments.find((document) => document.documentId === selectedPreviewId) || null;

  const splitSum = (groupOrderData?.participants || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const orderTotal = costEstimate?.breakdown?.total || costEstimate?.estimatedCost || 0;
  const isSplitExceeded = splitSum > orderTotal;

  return (
    <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            {isGroupStep ? 'Step 4' : 'Step 3'}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">
            {isGroupStep ? 'Group order split' : 'Review and pay'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {isGroupStep
              ? 'Configure splitting this payment among your campus friends.'
              : 'Confirm the full order summary before the wizard creates the order and triggers the selected payment flow.'}
          </p>
        </div>

        {isGroupStep ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Make this a group order</p>
                <p className="text-xs text-slate-500 mt-1">Split this order total with friends</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupOrderData?.isGroupOrder || false}
                  onChange={handleToggleGroup}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {groupOrderData?.isGroupOrder && (
              <div className="mt-6 border-t border-slate-100 pt-6 space-y-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Select Friends & Assign Amounts</h3>

                {friendsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                  </div>
                ) : friendsError ? (
                  <p className="text-sm text-rose-600">{friendsError}</p>
                ) : (groupOrderData?.friends || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No accepted friends found. Search and add friends on your dashboard first!</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                    {(groupOrderData?.friends || []).map((friend) => {
                      const participant = (groupOrderData?.participants || []).find((p) => p.userId === friend._id);
                      const isSelected = !!participant;

                      return (
                        <div
                          key={friend._id}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                            isSelected ? 'border-sky-300 bg-sky-50/50' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleFriendCheckbox(friend._id, e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{friend.name}</p>
                              <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 mt-0.5 rounded bg-slate-200/60 text-slate-600">
                                {friend.role}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-600">₹</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="Amount"
                                value={participant.amount || ''}
                                onChange={(e) => handleFriendAmount(friend._id, e.target.value)}
                                className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm text-right focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                min="0"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-2xl bg-slate-50 p-4 space-y-2 border border-slate-150">
                  <div className="flex justify-between text-sm font-semibold text-slate-700">
                    <span>Assigned Split:</span>
                    <span>₹{splitSum}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Total Order Value:</span>
                    <span>₹{orderTotal}</span>
                  </div>
                  {isSplitExceeded && (
                    <p className="text-xs text-amber-600 font-semibold mt-1">
                      ⚠️ Total split exceeds order amount
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Uploaded Documents</p>
              <div className="mt-4 space-y-3">
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
                        <p className="mt-1 text-sm text-slate-600">
                          Final review of the uploaded file and its analysis warnings before the order is created.
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
                              } catch (submissionError) {
                                setDocumentActionError(
                                  submissionError.response?.data?.message || 'Could not open the uploaded file.'
                                );
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
                    useSignedUrl
                  />
                </div>
              ) : null}
            </div>

          </>
        )}
      </div>

      <aside className="space-y-5">
        {!isGroupStep && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Order Summary</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Service Type</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{orderConfig.serviceType}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Pickup Slot</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{orderConfig.preferredPickupSlot}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {showPrintFields ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Copies</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{orderConfig.copies}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Colour Mode</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {orderConfig.colourMode === 'BlackAndWhite' ? 'Black & White' : 'Colour'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Sides</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{orderConfig.sided}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Paper Size</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{orderConfig.paperSize}</p>
                  </div>
                </>
              ) : null}

              {(orderConfig.serviceType === 'Printing'
                || orderConfig.serviceType === 'Photocopying'
                || orderConfig.serviceType === 'Binding') ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Binding</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{orderConfig.binding}</p>
                  </div>
                ) : null}

              {showScanningFields ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Output Format</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{orderConfig.outputFormat}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Scan Mode</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {orderConfig.colourMode === 'Colour' ? 'Colour' : 'Grayscale'}
                    </p>
                  </div>
                </>
              ) : null}

              {showConversionFields ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Conversion Type</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{orderConfig.conversionType}</p>
                </div>
              ) : null}
            </div>

            {(showPrintFields || showBindingFields) && orderConfig.printInstructions ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {showBindingFields ? 'Binding Instructions' : 'Print Instructions'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{orderConfig.printInstructions}</p>
              </div>
            ) : null}
          </div>
        )}

        <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Payment Method</p>
          <h3 className="mt-3 text-2xl font-semibold">{formatPaymentMethod(orderConfig.paymentMethod)}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {orderConfig.paymentMethod === 'Online'
              ? 'You will be redirected to Razorpay to complete your payment securely.'
              : 'The order is submitted now and stays pending until the counter team approves it.'}
          </p>

          {costEstimate?.breakdown ? (
            <div className="mt-5 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
              {estimateRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4">
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3 text-base font-semibold text-white">
                <span>Total</span>
                <span>{CURRENCY_FORMATTER.format(costEstimate.breakdown.total || 0)}</span>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </div>

        {!hideNavigation && (
          <div className="rounded-none md:rounded-[28px] border-t md:border border-slate-200 bg-white p-4 md:p-6 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] md:shadow-sm fixed bottom-0 left-0 w-full md:relative md:w-auto z-40 safe-pb">
            <div className="flex flex-col md:grid gap-2 md:gap-3">
              <button
                className="order-3 md:order-1 inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3.5 md:py-3 text-[15px] md:text-sm font-bold md:font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="button"
                onClick={onBack}
              >
                Back
              </button>
              {onNext && (
                <button
                  className="order-2 md:order-2 inline-flex items-center justify-center rounded-full border border-sky-600 bg-sky-50 px-5 py-3.5 md:py-3 text-[15px] md:text-sm font-bold md:font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                  type="button"
                  onClick={onNext}
                >
                  Proceed to Group Split
                </button>
              )}
              <button
                className="order-1 md:order-3 inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-4 md:py-3 text-[15px] md:text-sm font-bold md:font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300 shadow-md md:shadow-none"
                disabled={isSubmitting}
                type="button"
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    <span>Processing...</span>
                  </span>
                ) : orderConfig.paymentMethod === 'Online' ? 'Pay Now' : 'Confirm Order'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
};

export default WizardStep3Payment;
