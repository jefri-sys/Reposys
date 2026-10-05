import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Search, Users, Receipt, CreditCard } from 'lucide-react';
import api from '../../services/api';
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

const MobileWizardStep3Payment = ({
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
  const { user } = useContext(AuthContext) || {};

  // Group Split States
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
      participants: []
    }));
    if (checked && (!groupOrderData?.friends || groupOrderData.friends.length === 0)) {
      fetchFriends();
    }
  };

  const orderTotal = costEstimate?.breakdown?.total || costEstimate?.estimatedCost || 0;

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
      const orderRes = await api.post('/payments/create-order', { orderId });
      const { razorpayOrderId, amount, currency, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'Reposys — Saintgits College',
        description: 'Order ' + createdOrder.tokenNumber,
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
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

            setError('Payment could not be verified.');
          } catch (verifyError) {
            setError(verifyError.response?.data?.message || 'Payment could not be verified.');
          } finally {
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: { color: '#003d9b' },
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
      setError('Could not initiate payment.');
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
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      if (orderConfig.paymentMethod === 'Online') {
        if (isGuestMode) throw new Error('Guest orders must use pay at counter.');
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
  }, [submitRef, orderConfig.paymentMethod, isGuestMode, groupOrderData]);

  const splitSum = (groupOrderData?.participants || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const isSplitExceeded = splitSum > orderTotal;

  return (
    <div className="flex flex-col gap-5 w-full max-w-lg mx-auto font-['Inter'] pb-6">
      {/* Header Info */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-['Hanken_Grotesk'] text-[22px] font-bold text-[#003d9b]">
              {isGroupStep ? 'Group Split' : 'Review & Pay'}
            </h2>
            <p className="mt-1.5 text-[14px] text-slate-500 leading-relaxed">
              {isGroupStep ? 'Split cost with friends.' : 'Review your order and confirm payment.'}
            </p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#e9edff] text-[#003d9b]">
            {isGroupStep ? <Users size={20} /> : <CreditCard size={20} />}
          </div>
        </div>
      </div>

      {isGroupStep ? (
        <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0] flex flex-col gap-5">
          <div className="flex items-center justify-between">
             <div className="flex flex-col">
              <span className="font-semibold text-[15px] text-slate-900">Make this a Group Order</span>
              <span className="text-[12px] text-slate-500 mt-1">Split bill with friends automatically</span>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={groupOrderData?.isGroupOrder || false}
                onChange={handleToggleGroup}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#003d9b]"></div>
            </label>
          </div>

          {groupOrderData?.isGroupOrder && (
             <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
               {friendsLoading ? (
                 <p className="text-[13px] text-slate-500 text-center py-4">Loading friends...</p>
               ) : friendsError ? (
                 <p className="text-[13px] text-rose-500 text-center py-4">{friendsError}</p>
               ) : (groupOrderData?.friends || []).length === 0 ? (
                 <p className="text-[13px] text-slate-500 text-center py-4">No friends found.</p>
               ) : (
                 <div className="flex flex-col gap-3">
                   {(groupOrderData?.friends || []).map((friend) => {
                      const participant = (groupOrderData?.participants || []).find((p) => p.userId === friend._id);
                      const isSelected = !!participant;

                      return (
                        <div key={friend._id} className={`flex items-center justify-between p-3 rounded-[16px] border ${isSelected ? 'bg-sky-50 border-[#003d9b]' : 'bg-white border-slate-200'}`}>
                           <label className="flex items-center gap-3 flex-1 cursor-pointer">
                             <input 
                               type="checkbox" 
                               className="w-5 h-5 accent-[#003d9b]" 
                               checked={isSelected}
                               onChange={(e) => handleFriendCheckbox(friend._id, e.target.checked)}
                             />
                             <span className="font-semibold text-[14px] text-slate-800">{friend.name}</span>
                           </label>
                           {isSelected && (
                              <div className="flex items-center gap-1">
                                <span className="text-[14px] text-slate-500 font-semibold">₹</span>
                                <input 
                                  type="number" 
                                  value={participant.amount || ''}
                                  onChange={(e) => handleFriendAmount(friend._id, e.target.value)}
                                  className="w-20 text-right bg-white border border-slate-300 rounded-lg px-2 py-1 text-[14px] font-bold text-slate-900 outline-none focus:border-[#003d9b]" 
                                />
                              </div>
                           )}
                        </div>
                      )
                   })}
                 </div>
               )}
               
               <div className="bg-slate-50 rounded-[16px] p-4 flex flex-col gap-2 border border-slate-200">
                  <div className="flex justify-between items-center text-[14px]">
                     <span className="text-slate-500 font-semibold">Order Total</span>
                     <span className="text-slate-900 font-bold">₹{orderTotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                     <span className="text-slate-500 font-semibold">Assigned Split</span>
                     <span className={`font-bold ${isSplitExceeded ? 'text-rose-500' : 'text-[#003d9b]'}`}>₹{splitSum}</span>
                  </div>
                  {isSplitExceeded && <p className="text-[12px] text-rose-500 font-semibold mt-1">Split amount exceeds total.</p>}
               </div>
             </div>
          )}
        </div>
      ) : (
        <>
          {/* Order Summary (Mobile Redesign) */}
          <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0]">
            <h3 className="text-[14px] font-bold uppercase tracking-wider text-slate-500 mb-4">Summary</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
               <div className="bg-slate-50 rounded-[16px] p-3 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Service</span>
                  <p className="text-[14px] font-bold text-slate-900 mt-1">{orderConfig.serviceType}</p>
               </div>
               <div className="bg-slate-50 rounded-[16px] p-3 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Documents</span>
                  <p className="text-[14px] font-bold text-slate-900 mt-1">{uploadedDocuments.length}</p>
               </div>
               <div className="bg-slate-50 rounded-[16px] p-3 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Pickup Slot</span>
                  <p className="text-[14px] font-bold text-slate-900 mt-1">{orderConfig.preferredPickupSlot}</p>
               </div>
               <div className="bg-slate-50 rounded-[16px] p-3 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Payment</span>
                  <p className="text-[14px] font-bold text-slate-900 mt-1">{formatPaymentMethod(orderConfig.paymentMethod)}</p>
               </div>
            </div>

            {/* Total Block */}
            <div className="bg-[#0f172a] rounded-[20px] p-5 shadow-sm text-white flex justify-between items-center mt-2 relative overflow-hidden">
               <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-[#003d9b]/50 rounded-full blur-2xl pointer-events-none"></div>
               <span className="text-[16px] font-bold z-10 relative">Total to Pay</span>
               <span className="text-[24px] font-bold z-10 relative">₹{orderTotal}</span>
            </div>
          </div>
        </>
      )}
      
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-[16px] p-4 text-[14px] text-rose-600 font-medium">
          {error}
        </div>
      )}
    </div>
  );
};

export default MobileWizardStep3Payment;
