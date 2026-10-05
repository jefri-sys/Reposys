import { startTransition, useEffect, useState } from 'react';
import { AlertCircle, MessageSquareWarning } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import ComplaintConversationPanel from './ComplaintConversationPanel';
import {
  ACTIVE_COMPLAINT_STATUSES,
  appendComplaintMessage,
  formatComplaintDate,
  getComplaintCategoryLabel,
  getComplaintRaisedByName,
  isComplaintActive,
} from '../../utils/complaints';
import { Card, CardHeader, CardTitle, CardContent, Badge, LoadingState, EmptyState } from '../ui';

const ACTIVE_STATUS_PARAMS = ['Open', 'In_Progress'];

const STATUS_BADGE_VARIANTS = {
  Open: 'danger',
  In_Progress: 'warning',
  Resolved: 'success',
  Closed: 'secondary',
};

const StaffComplaintsPanel = ({ currentUserId, currentUserRole }) => {
  const socket = useSocket();
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendError, setSendError] = useState('');
  const [statusDraft, setStatusDraft] = useState('Open');
  const [statusNoteDraft, setStatusNoteDraft] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  const loadComplaints = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.get('/complaints', {
        params: {
          status: ACTIVE_STATUS_PARAMS,
          page: 1,
          limit: 50,
        },
      });

      startTransition(() => {
        setComplaints(Array.isArray(response.data?.complaints) ? response.data.complaints : []);
      });
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Could not load active complaints.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadComplaintDetail = async (complaintId) => {
    setIsDetailLoading(true);
    setDetailError('');

    try {
      const response = await api.get(`/complaints/${complaintId}`);
      const nextComplaint = response.data?.complaint || null;

      startTransition(() => {
        setSelectedComplaint(nextComplaint);
        setStatusDraft(nextComplaint?.status || 'Open');
        setStatusNoteDraft('');
      });
    } catch (loadError) {
      setDetailError(loadError.response?.data?.message || 'Could not load complaint details.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleComplaintMessage = (payload = {}) => {
      const complaintId = String(payload.complaintId || '');
      if (!complaintId) {
        return;
      }

      startTransition(() => {
        setComplaints((currentComplaints) => {
          const match = currentComplaints.find((complaint) => String(complaint._id) === complaintId);

          if (!match) {
            return currentComplaints;
          }

          const remainingComplaints = currentComplaints.filter((complaint) => String(complaint._id) !== complaintId);
          return [{
            ...match,
            updatedAt: payload.message?.timestamp || new Date().toISOString(),
          }, ...remainingComplaints];
        });

        setSelectedComplaint((currentComplaint) => {
          if (!currentComplaint || String(currentComplaint._id) !== complaintId) {
            return currentComplaint;
          }

          return {
            ...currentComplaint,
            messages: appendComplaintMessage(currentComplaint.messages, payload.message),
          };
        });
      });
    };

    socket.on('complaint_message', handleComplaintMessage);

    return () => {
      socket.off('complaint_message', handleComplaintMessage);
    };
  }, [socket]);

  const handleOpenComplaint = async (complaintId) => {
    if (!complaintId) {
      return;
    }

    setSelectedComplaintId(complaintId);
    setMessageDraft('');
    setSendError('');
    setStatusError('');
    await loadComplaintDetail(complaintId);
  };

  const handleSendMessage = async () => {
    const trimmedMessage = messageDraft.trim();
    if (!selectedComplaintId || !trimmedMessage || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    setSendError('');

    try {
      const response = await api.post(`/complaints/${selectedComplaintId}/messages`, {
        text: trimmedMessage,
      });
      const nextMessages = response.data?.complaint?.messages || [];
      const latestMessage = nextMessages[nextMessages.length - 1] || null;

      startTransition(() => {
        setSelectedComplaint((currentComplaint) => (
          currentComplaint
            ? {
              ...currentComplaint,
              messages: appendComplaintMessage(currentComplaint.messages, latestMessage),
            }
            : currentComplaint
        ));
        setComplaints((currentComplaints) => {
          const match = currentComplaints.find((complaint) => String(complaint._id) === String(selectedComplaintId));
          if (!match) {
            return currentComplaints;
          }

          const remainingComplaints = currentComplaints.filter((complaint) => String(complaint._id) !== String(selectedComplaintId));
          return [{
            ...match,
            updatedAt: latestMessage?.timestamp || new Date().toISOString(),
          }, ...remainingComplaints];
        });
        setMessageDraft('');
      });
    } catch (messageError) {
      setSendError(messageError.response?.data?.message || 'Could not send that message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedComplaintId || !statusDraft || isUpdatingStatus) {
      return;
    }

    setIsUpdatingStatus(true);
    setStatusError('');

    try {
      const response = await api.patch(`/complaints/${selectedComplaintId}/status`, {
        status: statusDraft,
        note: statusNoteDraft.trim(),
      });
      const updatedComplaint = response.data?.complaint || null;

      startTransition(() => {
        setSelectedComplaint((currentComplaint) => (
          currentComplaint
            ? {
              ...currentComplaint,
              status: updatedComplaint?.status || statusDraft,
              statusHistory: updatedComplaint?.statusHistory || currentComplaint.statusHistory,
              resolvedAt: updatedComplaint?.resolvedAt || null,
              updatedAt: updatedComplaint?.updatedAt || currentComplaint.updatedAt,
            }
            : currentComplaint
        ));

        setComplaints((currentComplaints) => {
          const remainingComplaints = currentComplaints.filter(
            (complaint) => String(complaint._id) !== String(selectedComplaintId)
          );

          if (!updatedComplaint || !isComplaintActive(updatedComplaint.status)) {
            return remainingComplaints;
          }

          return [{
            ...updatedComplaint,
            raisedBy: selectedComplaint?.raisedBy,
            orderId: selectedComplaint?.orderId,
          }, ...remainingComplaints];
        });

        setStatusNoteDraft('');
      });
    } catch (updateError) {
      setStatusError(updateError.response?.data?.message || 'Could not update complaint status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const closeModal = () => {
    setSelectedComplaintId('');
    setSelectedComplaint(null);
    setDetailError('');
    setSendError('');
    setStatusError('');
    setMessageDraft('');
  };

  const activeComplaintCount = complaints.filter((complaint) => ACTIVE_COMPLAINT_STATUSES.includes(complaint.status)).length;

  return (
    <>
      <Card className="border-0 shadow-sm overflow-hidden bg-white/60 backdrop-blur-md">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Complaint Desk</p>
              <CardTitle className="text-xl">Active complaints</CardTitle>
            </div>
            {activeComplaintCount > 0 && (
              <Badge variant="danger" className="text-sm px-2">
                {activeComplaintCount}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-8">
              <LoadingState message="Loading complaints..." />
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-6">
              <EmptyState 
                icon={MessageSquareWarning} 
                title="No active complaints" 
                description="New complaint alerts will appear here in real time." 
              />
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((complaint) => (
                <button
                  key={complaint._id}
                  type="button"
                  onClick={() => handleOpenComplaint(complaint._id)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-red-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{complaint.complaintToken}</p>
                      <p className="mt-1 text-sm text-slate-600">{getComplaintRaisedByName(complaint)}</p>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANTS[complaint.status] || 'secondary'}>
                      {complaint.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">
                      {getComplaintCategoryLabel(complaint.category)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      {formatComplaintDate(complaint.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedComplaintId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 sm:p-6 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close complaint detail"
            className="absolute inset-0"
            onClick={closeModal}
          />

          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-white shadow-2xl">
            {isDetailLoading && !selectedComplaint ? (
              <div className="p-16">
                <LoadingState message="Loading details..." />
              </div>
            ) : detailError ? (
              <div className="p-10 text-center">
                <h2 className="text-2xl font-bold text-slate-900">Complaint unavailable</h2>
                <p className="mt-2 text-sm text-red-600">{detailError}</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-full">
                <ComplaintConversationPanel
                  complaint={selectedComplaint}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  messageDraft={messageDraft}
                  onMessageDraftChange={setMessageDraft}
                  onSendMessage={handleSendMessage}
                  isSendingMessage={isSendingMessage}
                  sendError={sendError}
                  statusDraft={statusDraft}
                  onStatusDraftChange={setStatusDraft}
                  statusNoteDraft={statusNoteDraft}
                  onStatusNoteDraftChange={setStatusNoteDraft}
                  onUpdateStatus={handleUpdateStatus}
                  isUpdatingStatus={isUpdatingStatus}
                  statusError={statusError}
                  onClose={closeModal}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StaffComplaintsPanel;
