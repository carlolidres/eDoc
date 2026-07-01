export type DocumentStatus =
  | 'draft'
  | 'preparing'
  | 'ready_for_routing'
  | 'in_routing'
  | 'awaiting_my_action'
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

export interface InboxTask {
  id: string
  documentTitle: string
  action: RouteAction
  dueDate: string
  assignedBy: string
  instructions: string
}
