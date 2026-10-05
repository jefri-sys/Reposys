import { useEffect, useRef } from 'react';
import ComplaintStatusBadge from './ComplaintStatusBadge';
import {
  COMPLAINT_STATUS_OPTIONS,
  formatComplaintStatus,
  formatComplaintDate,
  getComplaintCategoryLabel,
  getComplaintOrderToken,
  getComplaintRaisedByName,
  getComplaintRaisedByRole,
  sortComplaintMessages,
} from '../../utils/complaints';

const resolveMessageSenderName = (complaint, message, isComplaintOwnerMessage) => {
  if (message?.senderId?.name) {
    return message.senderId.name;
  }

  if (isComplaintOwnerMessage) {
    return getComplaintRaisedByName(complaint);
  }

  return message?.senderRole || 'Staff';
};

const ComplaintConversationPanel = ({
  complaint,
  currentUserId,
  currentUserRole,
  messageDraft,
  onMessageDraftChange,
  onSendMessage,
  isSendingMessage = false,
  sendError = '',
  statusDraft,
  onStatusDraftChange,
  statusNoteDraft,
  onStatusNoteDraftChange,
  onUpdateStatus,
  isUpdatingStatus = false,
  statusError = '',
  onClose,
  emptyTitle = 'Select a complaint',
  emptyText = 'Choose a complaint to review the conversation and respond in real time.',
  messagePlaceholder = 'Type a message for the complaint thread.',
}) => {
  const messageEndRef = useRef(null);
  const sortedMessages = sortComplaintMessages(complaint?.messages || []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [complaint?._id, sortedMessages.length]);

  if (!complaint) {
    return (
      <div className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-950">{emptyTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{emptyText}</p>
      </div>
    );
  }

  const complaintOwnerId = String(complaint?.raisedBy?._id || complaint?.raisedBy || '');
  const activeUserId = String(currentUserId || '');
  const isRequesterView = activeUserId && activeUserId === complaintOwnerId;
  const showStatusControls = typeof onUpdateStatus === 'function';

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Complaint Detail</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {complaint.complaintToken}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {getComplaintCategoryLabel(complaint.category)} for order {getComplaintOrderToken(complaint)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ComplaintStatusBadge status={complaint.status} />
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Raised By</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{getComplaintRaisedByName(complaint)}</p>
          {getComplaintRaisedByRole(complaint) ? (
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
              {getComplaintRaisedByRole(complaint)}
            </p>
          ) : null}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Date Raised</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{formatComplaintDate(complaint.createdAt)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current Status</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{formatComplaintStatus(complaint.status)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resolved At</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {complaint.resolvedAt ? formatComplaintDate(complaint.resolvedAt) : 'Pending'}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Description</p>
        <p className="mt-3 text-sm leading-7 text-slate-700">{complaint.description}</p>
        {Array.isArray(complaint.attachmentUrls) && complaint.attachmentUrls.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {complaint.attachmentUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                View Attachment
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {showStatusControls ? (
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status Control</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Update complaint workflow</h3>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {currentUserRole}
            </span>
          </div>

          {statusError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {statusError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_180px]">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Status</span>
              <select
                value={statusDraft}
                onChange={(event) => onStatusDraftChange?.(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
              >
                {COMPLAINT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Note</span>
              <textarea
                rows={3}
                value={statusNoteDraft}
                onChange={(event) => onStatusNoteDraftChange?.(event.target.value)}
                placeholder="Add a quick note for the complaint history."
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={onUpdateStatus}
                disabled={isUpdatingStatus}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isUpdatingStatus ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Conversation</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Live complaint chat</h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
            {sortedMessages.length} message{sortedMessages.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-5 max-h-[24rem] space-y-4 overflow-y-auto pr-2">
          {sortedMessages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm leading-7 text-slate-600">
              No messages yet. Start the thread below and the other side will receive it in real time.
            </div>
          ) : (
            sortedMessages.map((message, index) => {
              const senderId = String(message?.senderId?._id || message?.senderId || '');
              const senderRole = message?.senderRole || '';
              const isComplaintOwnerMessage = senderId
                ? senderId === complaintOwnerId
                : ['Student', 'Faculty', 'User'].includes(senderRole);
              const isOwnMessage = senderId && activeUserId && senderId === activeUserId;
              const alignRight = isOwnMessage || (isRequesterView && isComplaintOwnerMessage);

              return (
                <div
                  key={`${message.timestamp || index}-${message.text || ''}-${senderId}`}
                  className={alignRight ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={[
                      'max-w-[85%] rounded-[24px] px-4 py-4 shadow-sm',
                      alignRight
                        ? 'border border-sky-200 bg-sky-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-900',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={['text-xs font-semibold uppercase tracking-[0.16em]', alignRight ? 'text-sky-100' : 'text-slate-500'].join(' ')}>
                        {resolveMessageSenderName(complaint, message, isComplaintOwnerMessage)}
                      </p>
                      {message?.senderRole ? (
                        <span className={['text-[11px] uppercase tracking-[0.14em]', alignRight ? 'text-sky-100/90' : 'text-slate-400'].join(' ')}>
                          {message.senderRole}
                        </span>
                      ) : null}
                    </div>
                    <p className={['mt-2 text-sm leading-7', alignRight ? 'text-white' : 'text-slate-700'].join(' ')}>
                      {message.text}
                    </p>
                    {message.attachmentUrl ? (
                      <a
                        href={message.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={['mt-3 inline-flex text-sm font-semibold underline-offset-4 hover:underline', alignRight ? 'text-white' : 'text-sky-700'].join(' ')}
                      >
                        Open attachment
                      </a>
                    ) : null}
                    <p className={['mt-3 text-[11px] uppercase tracking-[0.14em]', alignRight ? 'text-sky-100/90' : 'text-slate-400'].join(' ')}>
                      {formatComplaintDate(message.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messageEndRef} />
        </div>
      </div>

      {sendError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {sendError}
        </div>
      ) : null}

      {typeof onSendMessage === 'function' ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSendMessage();
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">New Message</span>
            <textarea
              rows={3}
              value={messageDraft}
              onChange={(event) => onMessageDraftChange?.(event.target.value)}
              placeholder={messagePlaceholder}
              className="w-full rounded-[28px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSendingMessage || !messageDraft.trim()}
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSendingMessage ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
};

export default ComplaintConversationPanel;
