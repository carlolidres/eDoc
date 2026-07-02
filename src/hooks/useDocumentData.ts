import { useGraphQLQuery } from './useGraphQLQuery'
import {
  DASHBOARD_METRICS,
  DOCUMENTS_LIST,
  INBOX_TASKS,
  type DashboardMetricsResponse,
  type DocumentsListResponse,
  type InboxTasksResponse,
} from '../graphql/queries'
import type { DashboardMetrics, DocumentListItem, DocumentStatus, InboxTask, RouteAction } from '../types/domain'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function toDocumentStatus(value: string): DocumentStatus {
  const allowed: DocumentStatus[] = [
    'draft', 'preparing', 'ready_for_routing', 'in_routing', 'awaiting_action',
    'returned', 'rejected', 'completed', 'cancelled', 'expired', 'archived',
  ]
  return allowed.includes(value as DocumentStatus) ? (value as DocumentStatus) : 'draft'
}

export function useDocumentsList() {
  return useGraphQLQuery<DocumentsListResponse>('documents-list', DOCUMENTS_LIST)
}

export function useDocumentListItems() {
  const query = useDocumentsList()
  const items: DocumentListItem[] = (query.data?.documents ?? []).map((document) => ({
    id: document.id,
    title: document.title,
    referenceNumber: document.reference_number ?? '—',
    status: toDocumentStatus(document.status),
    owner: document.owner?.display_name ?? '—',
    department: '—',
    currentStep: '—',
    dueDate: formatDate(document.due_at),
    lastActivity: formatDate(document.updated_at),
    priority: (document.priority as DocumentListItem['priority']) ?? 'normal',
  }))
  return { ...query, items }
}

export function useDashboardMetricsData() {
  const query = useGraphQLQuery<DashboardMetricsResponse>('dashboard-metrics', DASHBOARD_METRICS)
  const metrics: DashboardMetrics = {
    awaitingMyAction: query.data?.awaitingMyAction.aggregate?.count ?? 0,
    myDrafts: query.data?.myDrafts.aggregate?.count ?? 0,
    inRouting: query.data?.inRouting.aggregate?.count ?? 0,
    dueSoon: 0,
    overdue: 0,
    returned: query.data?.returned.aggregate?.count ?? 0,
    rejected: query.data?.rejected.aggregate?.count ?? 0,
    completed: query.data?.completed.aggregate?.count ?? 0,
    completionRate: 0,
    averageRoutingTimeHours: 0,
  }
  return { ...query, metrics }
}

export function useInboxTasksData() {
  const query = useGraphQLQuery<InboxTasksResponse>('inbox-tasks', INBOX_TASKS)
  const tasks: InboxTask[] = (query.data?.route_step_assignees ?? [])
    .filter((row) => row.step?.route)
    .map((row) => ({
      id: row.id,
      documentTitle: row.step?.route?.document?.title ?? `Document ${row.step?.route?.document_id ?? ''}`,
      action: (row.step?.action ?? 'review') as RouteAction,
      dueDate: formatDate(row.step?.due_at),
      assignedBy: '—',
      instructions: row.step?.route?.document?.reference_number
        ? `Ref: ${row.step.route.document.reference_number}`
        : '',
    }))
  return { ...query, tasks }
}
