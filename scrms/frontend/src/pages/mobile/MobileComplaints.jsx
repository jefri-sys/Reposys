import { useState, useEffect, useContext, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquareText, Plus, X, Send } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContextObject';
import { formatComplaintDate, getComplaintCategoryLabel, appendComplaintMessage } from '../../utils/complaints';

const getStatusColor = (status) => {
  switch (status) {
    case 'Pending': return 'bg-amber-100 text-amber-700';
    case 'Investigating': return 'bg-blue-100 text-blue-700';
    case 'Resolved': return 'bg-emerald-100 text-emerald-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const MobileComplaints = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Detail View State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isActive = true;
    const fetchComplaints = async () => {
      try {
        const response = await api.get('/complaints', { params: { limit: 50 } });
        if (isActive) {
          setComplaints(response.data?.complaints || []);
        }
      } catch (err) {
        // ignore
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    fetchComplaints();
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleComplaintMessage = (payload = {}) => {
      const complaintId = String(payload.complaintId || '');
      if (!complaintId) return;
      startTransition(() => {
        setComplaints(curr => {
          const match = curr.find(c => String(c._id) === complaintId);
          if (!match) return curr;
          const remaining = curr.filter(c => String(c._id) !== complaintId);
          return [{ ...match, updatedAt: payload.message?.timestamp || new Date().toISOString() }, ...remaining];
        });
        setSelectedComplaint(curr => {
          if (!curr || String(curr._id) !== complaintId) return curr;
          return { ...curr, messages: appendComplaintMessage(curr.messages, payload.message) };
        });
      });
    };
    socket.on('complaint_message', handleComplaintMessage);
    return () => socket.off('complaint_message', handleComplaintMessage);
  }, [socket]);

  const handleSelectComplaint = async (complaintId) => {
    setIsDetailLoading(true);
    // Show a skeleton or loading state for the modal
    setSelectedComplaint({ _id: complaintId, isLoading: true });
    try {
      const response = await api.get(`/complaints/${complaintId}`);
      setSelectedComplaint(response.data?.complaint || null);
    } catch (err) {
      setSelectedComplaint(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageDraft.trim() || isSending || !selectedComplaint?._id) return;
    setIsSending(true);
    try {
      const response = await api.post(`/complaints/${selectedComplaint._id}/messages`, { text: messageDraft.trim() });
      const nextMessages = response.data?.complaint?.messages || [];
      const latestMessage = nextMessages[nextMessages.length - 1] || null;
      setSelectedComplaint(curr => curr ? { ...curr, messages: appendComplaintMessage(curr.messages, latestMessage) } : curr);
      setMessageDraft('');
    } catch (err) {
      // ignore
    } finally {
      setIsSending(false);
    }
  };

  if (selectedComplaint) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col">
        <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedComplaint(null)} className="text-slate-600">
              <ArrowLeft size={24} />
            </button>
            {selectedComplaint.isLoading ? (
              <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
            ) : (
              <div>
                <h1 className="text-[16px] font-bold text-[#0F172A] leading-tight">{selectedComplaint.complaintToken}</h1>
                <p className="text-[12px] text-slate-500 font-medium">{getComplaintCategoryLabel(selectedComplaint.category)}</p>
              </div>
            )}
          </div>
          {!selectedComplaint.isLoading && (
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getStatusColor(selectedComplaint.status)}`}>
              {selectedComplaint.status}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
          {selectedComplaint.isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-rose-200 border-t-rose-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Original Complaint Context */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-2">
                <p className="text-[14px] text-slate-700 leading-relaxed">{selectedComplaint.description}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium">{formatComplaintDate(selectedComplaint.createdAt)}</span>
                  {selectedComplaint.orderId && (
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">
                      Order {selectedComplaint.orderId.tokenNumber || 'Link'}
                    </span>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              {selectedComplaint.messages?.map((msg, idx) => {
                const isMe = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                const isSystem = msg.senderRole === 'System';
                
                if (isSystem) {
                  return (
                    <div key={idx} className="flex justify-center my-4">
                      <span className="bg-slate-100 text-slate-500 text-[11px] font-medium px-3 py-1 rounded-full">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#0F172A] text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                      <p className="text-[14px] leading-snug">{msg.text}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-slate-400' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {!selectedComplaint.isLoading && selectedComplaint.status !== 'Resolved' && (
          <div className="bg-white border-t border-slate-200 p-4">
            <div className="flex gap-2">
              <input 
                type="text"
                value={messageDraft}
                onChange={e => setMessageDraft(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-rose-300"
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!messageDraft.trim() || isSending}
                className="w-12 h-12 bg-[#0047AB] rounded-xl flex items-center justify-center text-white disabled:opacity-50 active:scale-95 transition-transform"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[18px] font-bold text-[#0F172A]">My Complaints</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-rose-200 border-t-rose-600 animate-spin" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquareText size={28} className="text-slate-300" />
            </div>
            <h3 className="text-[16px] font-bold text-[#0F172A] mb-1">No complaints</h3>
            <p className="text-[13px] text-slate-500 max-w-[250px]">You haven't raised any issues yet. If you have a problem, you can raise a complaint from your order details.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map(complaint => (
              <div 
                key={complaint._id} 
                onClick={() => handleSelectComplaint(complaint._id)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0F172A]">{complaint.complaintToken}</h3>
                    <p className="text-[12px] font-medium text-slate-500 mt-0.5">{getComplaintCategoryLabel(complaint.category)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getStatusColor(complaint.status)}`}>
                    {complaint.status}
                  </span>
                </div>
                <p className="text-[13px] text-slate-600 line-clamp-2 leading-relaxed mb-3">
                  {complaint.description}
                </p>
                <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-[11px] font-medium text-slate-400">
                  <span>{formatComplaintDate(complaint.createdAt)}</span>
                  <span>Tap to view conversation</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileComplaints;
