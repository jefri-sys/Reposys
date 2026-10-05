import {
  AlertTriangle,
  CreditCard,
  Info,
  MessageCircle,
  Package,
  Star,
} from 'lucide-react';
import { formatNotificationTimeAgo } from '../../utils/notifications';

const NOTIFICATION_TYPE_STYLES = {
  order_update: {
    Icon: Package,
    shellClass: 'bg-sky-100 text-sky-700',
  },
  payment: {
    Icon: CreditCard,
    shellClass: 'bg-emerald-100 text-emerald-700',
  },
  complaint: {
    Icon: MessageCircle,
    shellClass: 'bg-rose-100 text-rose-700',
  },
  inventory: {
    Icon: AlertTriangle,
    shellClass: 'bg-amber-100 text-amber-700',
  },
  system: {
    Icon: Info,
    shellClass: 'bg-slate-200 text-slate-700',
  },
  rating_prompt: {
    Icon: Star,
    shellClass: 'bg-yellow-100 text-yellow-700',
  },
  queue_update: {
    Icon: Package,
    shellClass: 'bg-sky-100 text-sky-700',
  },
};

const DEFAULT_NOTIFICATION_STYLE = {
  Icon: Info,
  shellClass: 'bg-slate-200 text-slate-700',
};

const NotificationItem = ({
  notification,
  onClick,
  trailingAction = null,
}) => {
  const notificationStyle = NOTIFICATION_TYPE_STYLES[notification?.type] || DEFAULT_NOTIFICATION_STYLE;
  const { Icon, shellClass } = notificationStyle;

  return (
    <div className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50">
      <div className="flex items-start gap-3">
        <div className={['mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', shellClass].join(' ')}>
          <Icon className="h-4 w-4" />
        </div>

        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">{notification?.title || 'Notification'}</p>
              <p
                className="mt-1 overflow-hidden text-[13px] leading-5 text-slate-500"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {notification?.message || ''}
              </p>
            </div>

            {!notification?.isRead && (
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
            )}
          </div>

          <p className="mt-2 text-xs text-slate-400">{formatNotificationTimeAgo(notification?.createdAt)}</p>
        </button>

        {trailingAction ? (
          <div className="shrink-0">
            {trailingAction}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default NotificationItem;
