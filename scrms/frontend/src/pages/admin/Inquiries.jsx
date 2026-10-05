import { useState, useEffect } from 'react';
import { Mail, Search, CheckCircle2, Clock, Inbox, Send, AlertCircle, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
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
  Badge
} from '../../components/ui';

const Inquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  
  // Reply Modal State
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setError('');
    try {
      const response = await api.get('/admin/inquiries');
      setInquiries(response.data.inquiries);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const response = await api.patch(`/admin/inquiries/${id}/status`, { status: newStatus });
      setInquiries(inquiries.map(inq => inq._id === id ? response.data.inquiry : inq));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setReplying(true);
    try {
      const response = await api.patch(`/admin/inquiries/${selectedInquiry._id}/respond`, { response: replyText });
      setInquiries(inquiries.map(inq => inq._id === selectedInquiry._id ? response.data.inquiry : inq));
      closeModal();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const closeModal = () => {
    setSelectedInquiry(null);
    setReplyText('');
  };

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = 
      inq.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      inq.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'All') return matchesSearch;
    return matchesSearch && inq.status === filter;
  });

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Read': return 'primary';
      case 'Responded': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="Support Inquiries"
          description="Manage and respond to user messages directly from the dashboard."
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

        <Card className="flex flex-col min-h-[600px] shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-5 bg-slate-50/50">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-slate-400" />
                  Inbox
                </CardTitle>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 w-full lg:w-auto">
                <div className="w-full sm:min-w-[280px]">
                  <Input
                    icon={Search}
                    placeholder="Search inquiries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-full sm:min-w-[160px]">
                  <Select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    options={[
                      { value: 'All', label: 'All Statuses' },
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Read', label: 'Read' },
                      { value: 'Responded', label: 'Responded' }
                    ]}
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 bg-slate-50/30">
            {loading ? (
              <div className="p-12">
                <LoadingState message="Loading inquiries..." />
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="p-12">
                <EmptyState 
                  title="No inquiries found"
                  description="There are no messages matching your criteria."
                  icon={Mail}
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredInquiries.map(inquiry => (
                  <div key={inquiry._id} className="p-6 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col lg:flex-row gap-6 lg:items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge variant={getStatusBadgeVariant(inquiry.status)}>
                            {inquiry.status}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> 
                            {new Date(inquiry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 mb-1">{inquiry.subject}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold text-slate-700">{inquiry.name}</span>
                            <span className="text-slate-300 hidden sm:inline">•</span>
                            <a href={`mailto:${inquiry.email}`} className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" /> {inquiry.email}
                            </a>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap border border-slate-100">
                          {inquiry.message}
                        </div>
                      </div>

                      <div className="flex flex-wrap lg:flex-col gap-2 min-w-[140px]">
                        {inquiry.status !== 'Responded' && (
                          <Button 
                            onClick={() => setSelectedInquiry(inquiry)}
                            icon={Send}
                            className="flex-1"
                          >
                            Reply
                          </Button>
                        )}
                        
                        {inquiry.status === 'Pending' && (
                          <Button 
                            variant="outline"
                            onClick={() => updateStatus(inquiry._id, 'Read')}
                            className="flex-1"
                          >
                            Mark Read
                          </Button>
                        )}
                        
                        {inquiry.status !== 'Responded' && (
                          <Button 
                            variant="successOutline"
                            icon={CheckCircle2}
                            onClick={() => updateStatus(inquiry._id, 'Responded')}
                            className="flex-1"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reply Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reply to Inquiry</h3>
                <p className="text-sm text-slate-500 mt-0.5">To: <span className="font-semibold">{selectedInquiry.name}</span> ({selectedInquiry.email})</p>
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleReply} className="p-6 flex flex-col gap-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Original Message</label>
                <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-200 max-h-32 overflow-y-auto">
                  {selectedInquiry.message}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Response</label>
                <textarea
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={8}
                  placeholder="Type your response here... This will be sent as an email."
                  className="w-full p-4 border border-slate-300 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 focus-visible:border-sky-500 resize-none transition-shadow"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeModal}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={replying} 
                  isLoading={replying}
                  icon={Send}
                >
                  Send Reply
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inquiries;
