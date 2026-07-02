import { useGraphQLQuery } from './useGraphQLQuery'
import {
  DASHBOARD_METRICS,
  DOCUMENTS_LIST,
  INBOX_ASSIGNMENT,
  INBOX_TASKS,
  type DashboardMetricsResponse,
  type DocumentsListResponse,
  type InboxAssignmentResponse,
  type InboxTasksResponse,
} from '../graphql/queries'
import type { DashboardMetrics, DocumentListItem, DocumentStatus, InboxTask, RouteAction } from '../types/domain'
import { dashboardDueDateBounds } from '../utils/dueDateMetrics'
import { isUuid } from '../utils/uuid'

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
  const dueDateBounds = dashboardDueDateBounds()
  const query = useGraphQLQuery<DashboardMetricsResponse>(
    'dashboard-metrics',
    DASHBOARD_METRICS,
    dueDateBounds,
  )
  const metrics: DashboardMetrics = {
    awaitingMyAction: query.data?.awaitingMyAction.aggregate?.count ?? 0,
    myDrafts: query.data?.myDrafts.aggregate?.count ?? 0,
    inRouting: query.data?.inRouting.aggregate?.count ?? 0,
    dueSoon: query.data?.dueSoon.aggregate?.count ?? 0,
    overdue: query.data?.overdue.aggregate?.count ?? 0,
    returned: query.data?.returned.aggregate?.count ?? 0,
    rejected: query.data?.rejected.aggregate?.count ?? 0,
    completed: query.data?.completed.aggregate?.count ?? 0,
    completionRate: 0,
    averageRoutingTimeHours: 0,
  }
  return { ...query, metrics }
}

function mapInboxAssigneeRow(row: InboxTasksResponse['route_step_assignees'][number]): InboxTask | null {
  const route = row.step?.route
  if (!route) return null
  const originalFile = route.version?.document_files?.[0] ?? null
  return {
    id: row.id,
    routeId: route.id,
    stepId: row.step?.id ?? '',
    documentId: route.document_id,
    documentTitle: route.document?.title ?? `Document ${route.document_id}`,
    action: (row.step?.action ?? 'review') as RouteAction,
    dueDate: formatDate(row.step?.due_at),
    assignedBy: '—',
    instructions: route.document?.reference_number ? `Ref: ${route.document.reference_number}` : '',
    versionId: route.version_id,
    versionSha256: route.version?.original_sha256 ?? null,
    previewFileId: originalFile?.id ?? null,
    previewFileName: originalFile?.file_name ?? null,
  }
}

export function useInboxTasksData() {
  const query = useGraphQLQuery<InboxTasksResponse>('inbox-tasks', INBOX_TASKS)
  const tasks: InboxTask[] = (query.data?.route_step_assignees ?? [])
    .map(mapInboxAssigneeRow)
    .filter((task): task is InboxTask => task !== null)
  return { ...query, tasks }
}

export function useInboxAssignment(assignmentId: string | undefined) {
  const assignmentQueryEnabled = isUuid(assignmentId)

  const query = useGraphQLQuery<InboxAssignmentResponse>(
    'inbox-assignment',
    INBOX_ASSIGNMENT,
    assignmentQueryEnabled ? { id: assignmentId } : undefined,
    { enabled: assignmentQueryEnabled },
  )
  const task = query.data?.route_step_assignees_by_pk
    ? mapInboxAssigneeRow(query.data.route_step_assignees_by_pk)
    : null
  return { ...query, task }
}
