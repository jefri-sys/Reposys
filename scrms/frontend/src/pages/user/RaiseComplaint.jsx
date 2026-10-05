import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import {
  COMPLAINT_CATEGORY_OPTIONS,
  canRaiseComplaintForStatus,
  formatComplaintStatus,
} from '../../utils/complaints';

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const RaiseComplaint = ({ orderId: orderIdProp }) => {
  const navigate = useNavigate();
  const params = useParams();
  const resolvedOrderId = orderIdProp || params.orderId || '';
  const [order, setOrder] = useState(null);
  const [category, setCategory] = useState('Print_Quality');
  const [description, setDescription] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadOrder = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.get(`/orders/${resolvedOrderId}`);
        if (!isActive) {
          return;
        }

        setOrder(response.data?.order || null);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(loadError.response?.data?.message || 'Could not load this order.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (!resolvedOrderId) {
      setIsLoading(false);
      setError('Order ID is required to raise a complaint.');
      return undefined;
    }

    loadOrder();

    return () => {
      isActive = false;
    };
  }, [resolvedOrderId]);

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0] || null;
    setError('');

    if (!file) {
      setAttachmentFile(null);
      setAttachmentUrl('');
      setUploadProgress(0);
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError('Attachment must be 25 MB or smaller.');
      event.target.value = '';
      return;
    }

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setError('Only PDF, JPG, PNG, or WEBP attachments are allowed.');
      event.target.value = '';
      return;
    }

    setAttachmentFile(file);
    setAttachmentUrl('');
    setUploadProgress(0);
  };

  const uploadAttachmentIfNeeded = async () => {
    if (!attachmentFile || attachmentUrl) {
      return attachmentUrl;
    }

    const formData = new FormData();
    formData.append('file', attachmentFile);

    const response = await api.post('/documents/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (!progressEvent.total) {
          return;
        }

        setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      },
    });

    return response.data?.cloudinaryUrl || '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setError('Description is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const uploadedAttachmentUrl = await uploadAttachmentIfNeeded();
      const response = await api.post('/complaints', {
        orderId: resolvedOrderId,
        category,
        description: trimmedDescription,
        attachmentUrls: uploadedAttachmentUrl ? [uploadedAttachmentUrl] : [],
      });
      const complaint = response.data?.complaint;

      navigate('/complaints', {
        replace: true,
        state: {
          successMessage: `Complaint ${complaint?.complaintToken || ''} submitted successfully.`,
          createdComplaintId: complaint?._id || '',
        },
      });
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Could not raise the complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
      </div>
    );
  }

  const canSubmitComplaint = Boolean(order && canRaiseComplaintForStatus(order.status));

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff,_#eef4ff_52%,_#f8fafc)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Raise Complaint</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Open a support case</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Share what went wrong with the order and the staff team will reply in the live complaint thread.
            </p>
          </div>
          <Link
            to={resolvedOrderId ? `/orders/${resolvedOrderId}` : '/orders'}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Back to Order
          </Link>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-white px-5 py-4 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        ) : null}

        <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_30px_120px_-60px_rgba(15,23,42,0.35)]">
          {order ? (
            <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order Token</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{order.tokenNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Service</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{order.serviceType}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current Status</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatComplaintStatus(order.status)}</p>
              </div>
            </div>
          ) : null}

          {!canSubmitComplaint ? (
            <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-900">
              Complaints can only be raised for orders that are currently Processing, Ready for Pickup, Completed, or Partial.
            </div>
          ) : null}

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
              >
                {COMPLAINT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-700">Description</span>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {description.length}/500
                </span>
              </div>
              <textarea
                rows={6}
                maxLength={500}
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the issue clearly so the team can investigate quickly."
                className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
              />
            </label>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Optional attachment</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Upload a supporting image or PDF. We reuse the secure document upload flow and attach the Cloudinary URL to the complaint.
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Max 25 MB</span>
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handleAttachmentChange}
                  className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 file:mr-4 file:rounded-full file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-sky-700"
                />
                {attachmentFile ? (
                  <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                    {attachmentFile.name}
                  </div>
                ) : null}
              </div>

              {uploadProgress > 0 ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <span>Attachment Upload</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-[width] duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canSubmitComplaint || isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RaiseComplaint;
