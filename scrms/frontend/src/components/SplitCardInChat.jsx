import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const SplitCardInChat = ({ splitCardData, currentUserId, isCreator, groupId }) => {
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'pay' | 'decline'
  const [error, setError] = useState(null);

  // Per-participant states for resend
  const [resendLoading, setResendLoading] = useState({}); // keyed by userId string
  const [resendErrors, setResendErrors] = useState({}); // keyed by userId string

  if (!splitCardData || !splitCardData.participants) return null;

  const { totalAmount, participants } = splitCardData;

  const sumOfPaid = participants.reduce((sum, p) => p.walletStatus === 'paid' ? sum + p.amount : sum, 0);

  // Find matching participant profile for current logged-in user
  const matchingParticipant = participants.find(p => {
    const pUserIdStr = p.userId?._id?.toString() || p.userId?.toString();
    return pUserIdStr === currentUserId?.toString();
  });

  const handleRespond = async (actionType) => {
    if (!matchingParticipant || !matchingParticipant.splitRequestId) return;
    setLoading(true);
    setActiveAction(actionType);
    setError(null);

    const action = actionType === 'pay' ? 'accepted' : 'declined';

    try {
      await api.post('/group-orders/split/respond', {
        splitRequestId: matchingParticipant.splitRequestId,
        action
      });
      setLoading(false);
      setActiveAction(null);
    } catch (err) {
      setLoading(false);
      setActiveAction(null);
      const msg = err.response?.data?.message || err.message || 'Operation failed';
      if (actionType === 'pay' && err.response?.status === 400 && msg === 'Insufficient wallet balance') {
        setError(
          <span className="flex items-center flex-wrap gap-1">
            Insufficient balance —{' '}
            <Link to="/wallet/topup" className="text-blue-600 underline font-semibold hover:text-blue-800">
              Top up here
            </Link>
          </span>
        );
      } else {
        setError(msg);
      }
    }
  };

  const handleResend = async (pUserIdStr) => {
    setResendLoading(prev => ({ ...prev, [pUserIdStr]: true }));
    setResendErrors(prev => ({ ...prev, [pUserIdStr]: null }));

    try {
      await api.post('/group-orders/split/send', {
        groupOrderId: splitCardData.groupOrderId || splitCardData._id,
        triggeredFrom: 'group_chat',
        groupChatId: groupId
      });
      setResendLoading(prev => ({ ...prev, [pUserIdStr]: false }));
    } catch (err) {
      setResendLoading(prev => ({ ...prev, [pUserIdStr]: false }));
      const msg = err.response?.data?.message || err.message || 'Resend failed';
      setResendErrors(prev => ({ ...prev, [pUserIdStr]: msg }));
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-gray-200/75 shadow-sm rounded-2xl p-5 my-3 w-[340px] max-w-[85%] self-center mx-auto text-gray-800 relative overflow-hidden group">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500 opacity-80" />
      
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Split Request</span>
        <span className="text-xl font-black text-gray-900 tracking-tight">₹{totalAmount}</span>
      </div>

      <hr className="border-gray-100/80 mb-4" />

      {/* Participant rows */}
      <div className="space-y-2.5 mb-3">
        {participants.map((p, idx) => {
          const pUserIdStr = p.userId?._id?.toString() || p.userId?.toString();
          const isMe = pUserIdStr === currentUserId?.toString();
          const nameToDisplay = p.name || p.userId?.name || 'Unknown';
          
          let statusChip = null;
          if (p.walletStatus === 'paid') {
            statusChip = <span className="bg-emerald-50 text-emerald-600 border border-emerald-100/50 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">Paid ✓</span>;
          } else if (p.walletStatus === 'declined') {
            statusChip = (
              <div className="flex items-center gap-1.5">
                {isCreator ? (
                  <>
                    <span className="bg-red-50 text-red-600 border border-red-100/50 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">Declined ✗</span>
                    <button
                      onClick={() => handleResend(pUserIdStr)}
                      disabled={resendLoading[pUserIdStr]}
                      className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:bg-gray-50 disabled:text-gray-400 px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {resendLoading[pUserIdStr] && (
                        <svg className="animate-spin h-2.5 w-2.5 text-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      Resend
                    </button>
                  </>
                ) : (
                  <span className="bg-red-50 text-red-600 border border-red-100/50 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">Declined ✗</span>
                )}
              </div>
            );
          } else {
            statusChip = <span className="bg-gray-50 text-gray-500 border border-gray-200/50 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide">Pending</span>;
          }

          return (
            <div key={pUserIdStr || idx} className="flex flex-col">
              <div className="flex items-center justify-between text-sm py-1">
                <span className="font-medium text-gray-700 truncate flex-1">
                  {nameToDisplay} {isMe && <span className="text-[11px] text-gray-400 font-normal ml-1">(You)</span>}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 font-mono text-xs">₹{p.amount}</span>
                  <span className="shrink-0 min-w-[60px] text-right flex justify-end">{statusChip}</span>
                </div>
              </div>
              {resendErrors[pUserIdStr] && (
                <div className="text-[10px] text-red-650 font-medium mt-0.5 text-right">
                  {resendErrors[pUserIdStr]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary line */}
      <div className="text-xs font-medium text-gray-500 flex justify-between items-center mt-4 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50">
        <span>Collected</span>
        <span className="text-gray-900 font-bold font-mono tracking-tight">₹{sumOfPaid} <span className="text-gray-400 font-normal">/ ₹{totalAmount}</span></span>
      </div>

      <hr className="border-gray-100/80 my-4" />

      {/* Action area */}
      {!isCreator && matchingParticipant && matchingParticipant.walletStatus === 'pending' && (
        <div className="space-y-2 mt-4 relative z-10">
          <div className="flex gap-2">
            <button
              onClick={() => handleRespond('pay')}
              disabled={loading}
              className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg py-2 font-semibold text-xs flex items-center justify-center transition-all active:scale-95 shadow-sm"
            >
              {loading && activeAction === 'pay' && <Spinner />}
              Pay ₹{matchingParticipant.amount}
            </button>
            <button
              onClick={() => handleRespond('decline')}
              disabled={loading}
              className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-lg py-2 font-semibold text-xs flex items-center justify-center transition-all active:scale-95 shadow-sm"
            >
              {loading && activeAction === 'decline' && <Spinner />}
              Decline
            </button>
          </div>
          {error && (
            <div className="text-[11px] text-red-600 font-medium leading-normal">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SplitCardInChat;
