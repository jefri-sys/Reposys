export const COMPLAINT_CATEGORY_OPTIONS = [
  { value: 'Print_Quality', label: 'Print Quality' },
  { value: 'Binding_Quality', label: 'Binding Quality' },
  { value: 'Wrong_Output', label: 'Wrong Output' },
  { value: 'Delay', label: 'Delay' },
  { value: 'Payment_Issue', label: 'Payment Issue' },
  { value: 'Other', label: 'Other' },
];

export const COMPLAINT_STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'In_Progress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
];

export const ACTIVE_COMPLAINT_STATUSES = ['Open', 'In_Progress'];
export const ELIGIBLE_COMPLAINT_ORDER_STATUSES = ['Processing', 'ReadyForPickup', 'Completed', 'Partial'];

const CATEGORY_LABEL_MAP = COMPLAINT_CATEGORY_OPTIONS.reduce((accumulator, option) => ({
  ...accumulator,
  [option.value]: option.label,
}), {});

const STATUS_LABEL_MAP = COMPLAINT_STATUS_OPTIONS.reduce((accumulator, option) => ({
  ...accumulator,
  [option.value]: option.label,
}), {});

const STATUS_BADGE_CLASS_MAP = {
  Open: 'border-rose-200 bg-rose-100 text-rose-700',
  In_Progress: 'border-amber-200 bg-amber-100 text-amber-800',
  Resolved: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  Closed: 'border-slate-200 bg-slate-100 text-slate-600',
};

export const formatComplaintStatus = (value = '') => (
  STATUS_LABEL_MAP[value]
  || value.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
);

export const getComplaintStatusClass = (status) => (
  STATUS_BADGE_CLASS_MAP[status] || 'border-slate-200 bg-slate-100 text-slate-700'
);

export const getComplaintCategoryLabel = (category = '') => (
  CATEGORY_LABEL_MAP[category]
  || category.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
);

export const getComplaintOrderToken = (complaint) => (
  complaint?.orderId?.tokenNumber
  || complaint?.orderToken
  || '--'
);

export const getComplaintRaisedByName = (complaint) => (
  complaint?.raisedBy?.name
  || complaint?.userName
  || 'User'
);

export const getComplaintRaisedByRole = (complaint) => (
  complaint?.raisedBy?.role
  || complaint?.userRole
  || ''
);

export const formatComplaintDate = (value, withTime = true) => {
  const parsedDate = value ? new Date(value) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return parsedDate.toLocaleString('en-IN', withTime
    ? {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
    : {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
};

export const isComplaintActive = (status) => ACTIVE_COMPLAINT_STATUSES.includes(status);

export const canRaiseComplaintForStatus = (status) => ELIGIBLE_COMPLAINT_ORDER_STATUSES.includes(status);

export const sortComplaintMessages = (messages = []) => [...messages]
  .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

export const appendComplaintMessage = (messages = [], nextMessage) => {
  if (!nextMessage) {
    return sortComplaintMessages(messages);
  }

  const candidateKey = [
    nextMessage.senderId?._id || nextMessage.senderId || '',
    nextMessage.senderRole || '',
    nextMessage.timestamp || '',
    nextMessage.text || '',
    nextMessage.attachmentUrl || '',
  ].join(':');

  const exists = messages.some((message) => (
    [
      message.senderId?._id || message.senderId || '',
      message.senderRole || '',
      message.timestamp || '',
      message.text || '',
      message.attachmentUrl || '',
    ].join(':') === candidateKey
  ));

  return exists
    ? sortComplaintMessages(messages)
    : sortComplaintMessages([...messages, nextMessage]);
};

export const isComplaintWithinDateRange = (complaint, startDate, endDate) => {
  const complaintDate = complaint?.createdAt ? new Date(complaint.createdAt) : null;

  if (!complaintDate || Number.isNaN(complaintDate.getTime())) {
    return true;
  }

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (complaintDate < start) {
      return false;
    }
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`);
    if (complaintDate > end) {
      return false;
    }
  }

  return true;
};

export const isResolvedToday = (complaint) => {
  if (complaint?.status !== 'Resolved' || !complaint?.resolvedAt) {
    return false;
  }

  const resolvedAt = new Date(complaint.resolvedAt);
  const today = new Date();

  return !Number.isNaN(resolvedAt.getTime())
    && resolvedAt.getDate() === today.getDate()
    && resolvedAt.getMonth() === today.getMonth()
    && resolvedAt.getFullYear() === today.getFullYear();
};
