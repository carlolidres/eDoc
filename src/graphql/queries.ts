export const CURRENT_PROFILE = `
  query CurrentProfile {
    profiles(limit: 1) {
      id
      organization_id
      display_name
      email
    }
  }
`

export const DOCUMENTS_LIST = `
  query DocumentsList {
    documents(order_by: { updated_at: desc }) {
      id
      title
      reference_number
      status
      priority
      due_at
      updated_at
      owner {
        display_name
      }
    }
  }
`

export const DASHBOARD_METRICS = `
  query DashboardMetrics {
    myDrafts: documents_aggregate(where: { status: { _eq: "draft" } }) {
      aggregate { count }
    }
    inRouting: documents_aggregate(where: { status: { _in: ["in_routing", "awaiting_action"] } }) {
      aggregate { count }
    }
    returned: documents_aggregate(where: { status: { _eq: "returned" } }) {
      aggregate { count }
    }
    rejected: documents_aggregate(where: { status: { _eq: "rejected" } }) {
      aggregate { count }
    }
    completed: documents_aggregate(where: { status: { _eq: "completed" } }) {
      aggregate { count }
    }
    awaitingMyAction: route_step_assignees_aggregate(
      where: { status: { _in: ["pending", "active"] } }
    ) {
      aggregate { count }
    }
  }
`

export const INBOX_TASKS = `
  query InboxTasks {
    route_step_assignees(
      where: { status: { _in: ["pending", "active"] } }
      order_by: { completed_at: asc_nulls_first }
    ) {
      id
      status
      step {
        id
        action
        due_at
        route {
          id
          document_id
          document {
            title
            reference_number
          }
        }
      }
    }
  }
`

export type CurrentProfileResponse = {
  profiles: Array<{
    id: string
    organization_id: string | null
    display_name: string
    email: string
  }>
}

export type DocumentsListResponse = {
  documents: Array<{
    id: string
    title: string
    reference_number: string | null
    status: string
    priority: string
    due_at: string | null
    updated_at: string
    owner: { display_name: string } | null
    department: { name: string } | null
  }>
}

export type DashboardMetricsResponse = {
  myDrafts: { aggregate: { count: number } | null }
  inRouting: { aggregate: { count: number } | null }
  returned: { aggregate: { count: number } | null }
  rejected: { aggregate: { count: number } | null }
  completed: { aggregate: { count: number } | null }
  awaitingMyAction: { aggregate: { count: number } | null }
}

export type InboxTasksResponse = {
  route_step_assignees: Array<{
    id: string
    status: string
    step: {
      id: string
      action: string
      due_at: string | null
      route: {
        id: string
        document_id: string
        document: { title: string; reference_number: string | null } | null
      } | null
    } | null
  }>
}
