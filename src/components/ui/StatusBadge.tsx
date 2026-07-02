import type { DocumentStatus } from '../../types/domain'

const labels: Record<DocumentStatus, string> = {
  draft: 'Draft',
  preparing: 'Preparing',
  ready_for_routing: 'Ready for Routing',
  in_routing: 'In Routing',
  awaiting_action: 'Awaiting Action',
  returned: 'Returned',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  archived: 'Archived',
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <span className={`status-badge status-${status}`}>{labels[status]}</span>
}
