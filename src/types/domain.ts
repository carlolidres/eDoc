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
    sign: 'Open to sign',
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
}
