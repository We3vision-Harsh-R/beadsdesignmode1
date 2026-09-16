const LABELS = {
  review: 'Payment in review',
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  completed: 'Completed',
  cancelled: 'Cancelled',
  active: 'Active',
  expired: 'Expired',
};

export default function StatusBadge({ value }) {
  return <span className={`status status-${value}`}>{LABELS[value] || value}</span>;
}
