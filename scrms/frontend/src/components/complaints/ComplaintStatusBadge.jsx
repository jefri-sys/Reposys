import { formatComplaintStatus, getComplaintStatusClass } from '../../utils/complaints';

const ComplaintStatusBadge = ({ status, className = '' }) => (
  <span
    className={[
      'inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]',
      getComplaintStatusClass(status),
      className,
    ].join(' ')}
  >
    {formatComplaintStatus(status)}
  </span>
);

export default ComplaintStatusBadge;
