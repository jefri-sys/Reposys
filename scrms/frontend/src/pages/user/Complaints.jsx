import { startTransition, useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContextObject';
import ComplaintConversationPanel from '../../components/complaints/ComplaintConversationPanel';
import ComplaintStatusBadge from '../../components/complaints/ComplaintStatusBadge';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import MobileComplaints from '../mobile/MobileComplaints';
import {
  COMPLAINT_CATEGORY_OPTIONS,
  COMPLAINT_STATUS_OPTIONS,
  appendComplaintMessage,
  formatComplaintDate,
  getComplaintCategoryLabel,
  getComplaintOrderToken,
} from '../../utils/complaints';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Select,
  Button,
  EmptyState,
  LoadingState,
  PageHeader
} from '../../components/ui';
import { MessageSquareText } from 'lucide-react';

const Complaints = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const socket = useSocket();
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [highlightComplaintId, setHighlightComplaintId] = useState(() => location.state?.createdComplaintId || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendError, setSendError] = useState('');

  const successMessage = location.state?.successMessage || '';

  const loadComplaintDetail = async (complaintId) => {
    setIsDetailLoading(true);
    setDetailError('');

    try {
      const response = await api.get(`/complaints/${complaintId}`);
      startTransition(() => {
        setSelectedComplaint(response.data?.complaint || null);
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
            limit: 50,
            ...(statusFilter !== 'All' ? { status: statusFilter } : {}),
            ...(categoryFilter !== 'All' ? { category: categoryFilter } : {}),
          },
        });

        if (!isActive) return;

        const nextComplaints = Array.isArray(response.data?.complaints) ? response.data.complaints : [];

        startTransition(() => {
          setComplaints(nextComplaints);
        });

        const preferredComplaintId = highlightComplaintId
          || (nextComplaints.some((complaint) => String(complaint._id) === String(selectedComplaintId))
            ? selectedComplaintId
            : '');

        if (preferredComplaintId) {
          setSelectedComplaintId(preferredComplaintId);
          await loadComplaintDetail(preferredComplaintId);
          if (highlightComplaintId) {
            setHighlightComplaintId('');
          }
        } else {
          setSelectedComplaintId('');
          setSelectedComplaint(null);
        }
      } catch (loadError) {
        if (!isActive) return;
        setError(loadError.response?.data?.message || 'Could not load your complaints.');
        setSelectedComplaintId('');
        setSelectedComplaint(null);
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
  }, [categoryFilter, highlightComplaintId, statusFilter]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleComplaintMessage = (payload = {}) => {
      const complaintId = String(payload.complaintId || '');
      if (!complaintId) return;

      startTransition(() => {
        setComplaints((currentComplaints) => {
          const match = currentComplaints.find((complaint) => String(complaint._id) === complaintId);
          if (!match) return currentComplaints;

          const remainingComplaints = currentComplaints.filter((complaint) => String(complaint._id) !== complaintId);
          return [{
            ...match,
            updatedAt: payload.message?.timestamp || new Date().toISOString(),
          }, ...remainingComplaints];
        });

        setSelectedComplaint((currentComplaint) => {
          if (!currentComplaint || String(currentComplaint._id) !== complaintId) return currentComplaint;
          return {
            ...currentComplaint,
            messages: appendComplaintMessage(currentComplaint.messages, payload.message),
          };
        });
      });
    };

    socket.on('complaint_message', handleComplaintMessage);
    return () => socket.off('complaint_message', handleComplaintMessage);
  }, [socket]);

  const handleSelectComplaint = async (complaintId) => {
    if (!complaintId) return;
    setSelectedComplaintId(complaintId);
    setMessageDraft('');
    setSendError('');
    await loadComplaintDetail(complaintId);
  };

  const handleSendMessage = async () => {
    const trimmedMessage = messageDraft.trim();
    if (!selectedComplaintId || !trimmedMessage || isSendingMessage) return;

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

  const visibleComplaints = complaints.filter((complaint) => {
    const searchValue = searchInput.trim().toLowerCase();
    if (!searchValue) return true;

    return [
      complaint.complaintToken,
      getComplaintOrderToken(complaint),
      getComplaintCategoryLabel(complaint.category),
      complaint.status,
      complaint.description,
    ].some((value) => String(value || '').toLowerCase().includes(searchValue));
  });

  const width = useWindowWidth();
  if (width < 768) {
    return <MobileComplaints />;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="My Complaints"
          description="Review every complaint raised for your orders and continue the live conversation with the counter team."
          actions={
            <Button as={Link} to="/orders" variant="outline">
              Back to Orders
            </Button>
          }
        />

        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle>Submitted cases</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Token, order, category"
                />
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'All', label: 'All Statuses' },
                    ...COMPLAINT_STATUS_OPTIONS
                  ]}
                />
                <Select
                  label="Category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={[
                    { value: 'All', label: 'All Categories' },
                    ...COMPLAINT_CATEGORY_OPTIONS
                  ]}
                />
              </div>

              {isLoading ? (
                <div className="py-12">
                  <LoadingState message="Loading complaints..." />
                </div>
              ) : visibleComplaints.length === 0 ? (
                <EmptyState 
                  icon={MessageSquareText}
                  title="No complaints found"
                  description="Open any eligible order and use the Raise Complaint button if you need help with an issue."
                />
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden mt-2">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Complaint Token</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date Raised</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleComplaints.map((complaint) => (
                          <TableRow 
                            key={complaint._id}
                            onClick={() => handleSelectComplaint(complaint._id)}
                            className={`cursor-pointer ${String(selectedComplaintId) === String(complaint._id) ? 'bg-slate-50' : ''}`}
                          >
                            <TableCell className="font-semibold">{complaint.complaintToken}</TableCell>
                            <TableCell>{getComplaintOrderToken(complaint)}</TableCell>
                            <TableCell>{getComplaintCategoryLabel(complaint.category)}</TableCell>
                            <TableCell><ComplaintStatusBadge status={complaint.status} /></TableCell>
                            <TableCell className="text-slate-500 whitespace-nowrap">{formatComplaintDate(complaint.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden flex flex-col divide-y divide-slate-100 bg-white">
                    {visibleComplaints.map((complaint) => (
                      <div
                        key={complaint._id}
                        onClick={() => handleSelectComplaint(complaint._id)}
                        className={`p-4 cursor-pointer transition-colors ${String(selectedComplaintId) === String(complaint._id) ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{complaint.complaintToken}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Order: {getComplaintOrderToken(complaint)}</p>
                          </div>
                          <ComplaintStatusBadge status={complaint.status} />
                        </div>
                        <div className="mt-3 flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {getComplaintCategoryLabel(complaint.category)}
                          </span>
                          <span className="text-slate-500">{formatComplaintDate(complaint.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col h-[600px] lg:h-auto">
            {isDetailLoading && !selectedComplaint ? (
              <Card className="h-full flex items-center justify-center">
                <LoadingState message="Loading details..." />
              </Card>
            ) : detailError ? (
              <Card className="h-full flex flex-col items-center justify-center p-6 text-center">
                <p className="text-lg font-semibold text-slate-900">Complaint unavailable</p>
                <p className="mt-2 text-sm text-red-600">{detailError}</p>
              </Card>
            ) : (
              <ComplaintConversationPanel
                complaint={selectedComplaint}
                currentUserId={user?.id || user?._id || ''}
                currentUserRole={user?.role || ''}
                messageDraft={messageDraft}
                onMessageDraftChange={setMessageDraft}
                onSendMessage={handleSendMessage}
                isSendingMessage={isSendingMessage}
                sendError={sendError}
                emptyText="Select any complaint row to open the full detail view and continue the live chat."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Complaints;
