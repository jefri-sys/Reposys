import { startTransition, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Search, MessageSquareWarning, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContextObject';
import ComplaintConversationPanel from '../../components/complaints/ComplaintConversationPanel';
import ComplaintStatusBadge from '../../components/complaints/ComplaintStatusBadge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Select,
  PageHeader,
  LoadingState,
  EmptyState,
  StatCard
} from '../../components/ui';
import {
  COMPLAINT_CATEGORY_OPTIONS,
  COMPLAINT_STATUS_OPTIONS,
  appendComplaintMessage,
  formatComplaintDate,
  getComplaintCategoryLabel,
  getComplaintOrderToken,
  getComplaintRaisedByName,
  isComplaintWithinDateRange,
  isResolvedToday,
} from '../../utils/complaints';

const Complaints = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const [complaints, setComplaints] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendError, setSendError] = useState('');
  const [statusDraft, setStatusDraft] = useState('Open');
  const [statusNoteDraft, setStatusNoteDraft] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

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
    let isActive = true;

    const loadComplaints = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.get('/complaints', {
          params: {
            page: 1,
            limit: 100,
            ...(statusFilter !== 'All' ? { status: statusFilter } : {}),
            ...(categoryFilter !== 'All' ? { category: categoryFilter } : {}),
          },
        });

        if (!isActive) {
          return;
        }

        const nextComplaints = Array.isArray(response.data?.complaints) ? response.data.complaints : [];
        startTransition(() => {
          setComplaints(nextComplaints);
        });
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(loadError.response?.data?.message || 'Could not load complaints.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadComplaints();

    return () => {
      isActive = false;
    };
  }, [categoryFilter, statusFilter]);

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

  const visibleComplaints = complaints.filter((complaint) => {
    const searchValue = searchInput.trim().toLowerCase();
    const matchesDate = isComplaintWithinDateRange(complaint, startDate, endDate);
    const matchesSearch = !searchValue
      || [
        complaint.complaintToken,
        getComplaintRaisedByName(complaint),
        getComplaintOrderToken(complaint),
        getComplaintCategoryLabel(complaint.category),
        complaint.status,
      ].some((value) => String(value || '').toLowerCase().includes(searchValue));

    return matchesDate && matchesSearch;
  });
  const openCount = visibleComplaints.filter((complaint) => complaint.status === 'Open').length;
  const inProgressCount = visibleComplaints.filter((complaint) => complaint.status === 'In_Progress').length;
  const resolvedTodayCount = visibleComplaints.filter(isResolvedToday).length;

  const handleSelectComplaint = async (complaintId) => {
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

        setComplaints((currentComplaints) => currentComplaints.map((complaint) => (
          String(complaint._id) === String(selectedComplaintId)
            ? {
              ...complaint,
              status: updatedComplaint?.status || complaint.status,
              resolvedAt: updatedComplaint?.resolvedAt || complaint.resolvedAt,
              updatedAt: updatedComplaint?.updatedAt || complaint.updatedAt,
            }
            : complaint
        )).filter((complaint) => (
          statusFilter === 'All' || complaint.status === statusFilter
        )));

        setStatusNoteDraft('');
      });
    } catch (updateError) {
      setStatusError(updateError.response?.data?.message || 'Could not update complaint status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="Complaints Management"
          description="Monitor every complaint across the system, respond in the live thread, and update workflow status."
          actions={
            <Button as={Link} to="/admin" variant="outline" icon={ArrowLeft}>
              Back to Admin
            </Button>
          }
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard 
            title="Open Complaints" 
            value={openCount} 
            icon={MessageSquareWarning} 
            variant="danger"
          />
          <StatCard 
            title="In Progress" 
            value={inProgressCount} 
            icon={Activity} 
            variant="warning" 
          />
          <StatCard 
            title="Resolved Today" 
            value={resolvedTodayCount} 
            icon={CheckCircle2} 
            variant="success" 
          />
        </div>

        <Card>
          <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle>Filter & Search</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <Input
                  icon={Search}
                  placeholder="Token, user, order..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  label="Search"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[{ value: 'All', label: 'All Statuses' }, ...COMPLAINT_STATUS_OPTIONS]}
                label="Status"
              />
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[{ value: 'All', label: 'All Categories' }, ...COMPLAINT_CATEGORY_OPTIONS]}
                label="Category"
              />
              <div className="flex gap-2 md:col-span-2 lg:col-span-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  label="Start Date"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  label="End Date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr] h-[800px]">
          <Card className="flex flex-col overflow-hidden h-full">
            <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>Complaints Inbox</CardTitle>
                <div className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">
                  {visibleComplaints.length}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col bg-slate-50/30">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                  <LoadingState message="Loading complaints..." />
                ) : visibleComplaints.length === 0 ? (
                  <EmptyState 
                    title="No complaints found"
                    description="Try adjusting your search or filters."
                    icon={Search}
                  />
                ) : (
                  visibleComplaints.map((complaint) => (
                    <button
                      key={complaint._id}
                      type="button"
                      onClick={() => handleSelectComplaint(complaint._id)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        String(selectedComplaintId) === String(complaint._id)
                          ? 'border-blue-300 bg-blue-50 shadow-sm ring-1 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{complaint.complaintToken}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            {getComplaintRaisedByName(complaint)}
                          </div>
                        </div>
                        <ComplaintStatusBadge status={complaint.status} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
                        <span className="font-medium text-slate-700">{getComplaintCategoryLabel(complaint.category)}</span>
                        <span>{formatComplaintDate(complaint.createdAt)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full overflow-hidden">
            {isDetailLoading && !selectedComplaint ? (
              <div className="flex-1 flex items-center justify-center bg-slate-50/50">
                <LoadingState message="Loading thread..." />
              </div>
            ) : detailError ? (
              <div className="flex-1 flex items-center justify-center bg-slate-50/50 p-8">
                <EmptyState 
                  title="Complaint Unavailable"
                  description={detailError}
                  icon={AlertCircle}
                />
              </div>
            ) : !selectedComplaint ? (
              <div className="flex-1 flex items-center justify-center bg-slate-50/50 p-8">
                <EmptyState 
                  title="No Complaint Selected"
                  description="Select a complaint from the inbox to open the full conversation and update its status."
                  icon={MessageSquareWarning}
                />
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <ComplaintConversationPanel
                  complaint={selectedComplaint}
                  currentUserId={user?.id || user?._id || ''}
                  currentUserRole={user?.role || 'Admin'}
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
                  emptyText="Select a complaint to open the full conversation, send messages, and update status."
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Complaints;
