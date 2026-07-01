import type { DashboardMetrics, DocumentListItem, InboxTask } from '../types/domain'

export const dashboardMetrics: DashboardMetrics = {
  awaitingMyAction: 0,
  myDrafts: 0,
  inRouting: 0,
  dueSoon: 0,
  overdue: 0,
  returned: 0,
  rejected: 0,
  completed: 0,
  completionRate: 0,
  averageRoutingTimeHours: 0,
}

export const sampleDocuments: DocumentListItem[] = []
export const sampleInboxTasks: InboxTask[] = []

export const routingTemplates = [
  'SOP approval',
  'Protocol approval',
  'Validation report approval',
  'Change control approval',
  'Deviation approval',
  'CAPA approval',
  'Annual product review approval',
  'Quality agreement approval',
  'Training acknowledgment',
  'Contract signing',
  'General document approval',
]
