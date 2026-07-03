export type DocumentStatus =
  | 'draft'
  | 'preparing'
  | 'ready_for_routing'
  | 'in_routing'
  | 'awaiting_action'
  | 'returned'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'archived'

export type RouteAction = 'review' | 'approve' | 'sign' | 'acknowledge'

export type SignatureFieldType =
  | 'signature'
  | 'initial'
  | 'name'
  | 'job_title'
  | 'date_signed'
  | 'text'
  | 'checkbox'
  | 'approval_meaning'
  | 'review_meaning'
  | 'acknowledgment'

const fieldTypeLabels: Record<SignatureFieldType, string> = {
  signature: 'Signature',
  initial: 'Initials',
  name: 'Printed name',
  job_title: 'Job title',
  date_signed: 'Date signed',
  text: 'Text',
  checkbox: 'Checkbox',
  approval_meaning: 'Approval statement',
  review_meaning: 'Review statement',
  acknowledgment: 'Acknowledgment statement',
}

export function signatureFieldTypeLabel(fieldType: SignatureFieldType): string {
  return fieldTypeLabels[fieldType]
}

/** Field types offered for a given route step action, most relevant first. */
export function fieldTypesForAction(action: RouteAction): SignatureFieldType[] {
  switch (action) {
    case 'sign':
      return ['signature', 'initial', 'name', 'date_signed', 'job_title', 'text']
    case 'approve':
      return ['approval_meaning', 'date_signed', 'name', 'text']
    case 'review':
      return ['review_meaning', 'date_signed', 'name', 'text']
    case 'acknowledge':
      return ['acknowledgment', 'date_signed', 'name', 'text']
    default:
      return ['text']
  }
}

export interface DashboardMetrics {
  awaitingMyAction: number
  myDrafts: number
  inRouting: number
  dueSoon: number
  overdue: number
  returned: number
  rejected: number
  completed: number
  completionRate: number
  averageRoutingTimeHours: number
}

export interface DocumentListItem {
  id: string
  title: string
  referenceNumber: string
  status: DocumentStatus
  owner: string
  department: string
  currentStep: string
  dueDate: string
  lastActivity: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export type AdvanceRouteAction = 'review' | 'approve' | 'acknowledge' | 'reject' | 'return'

export function advanceActionForRouteAction(action: RouteAction): AdvanceRouteAction | null {
  if (action === 'review' || action === 'approve' || action === 'acknowledge') return action
  return null
}

export function routeActionLabel(action: RouteAction): string {
  const labels: Record<RouteAction, string> = {
    review: 'Review',
    approve: 'Approve',
    sign: 'Sign',
    acknowledge: 'Acknowledge',
  }
  return labels[action]
}

export function completeActionLabel(action: RouteAction): string {
  const labels: Record<RouteAction, string> = {
    review: 'Mark reviewed',
    approve: 'Approve',
    acknowledge: 'Acknowledge',
    sign: 'Sign document',
  }
  return labels[action]
}

export interface InboxTask {
  id: string
  routeId: string
  stepId: string
  documentId: string
  documentTitle: string
  action: RouteAction
  dueDate: string
  assignedBy: string
  instructions: string
  versionId: string
  versionSha256: string | null
  previewFileId: string | null
  previewFileName: string | null
}
