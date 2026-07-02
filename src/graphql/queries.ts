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

export const ORG_PROFILES = `
  query OrgProfiles {
    profiles(order_by: { display_name: asc }) {
      id
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
  query DashboardMetrics($now: timestamptz!, $dueSoonCutoff: timestamptz!) {
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
      where: {
        status: { _eq: "active" }
        step: { status: { _eq: "active" } }
      }
    ) {
      aggregate { count }
    }
    dueSoon: route_step_assignees_aggregate(
      where: {
        status: { _eq: "active" }
        step: {
          status: { _eq: "active" }
          due_at: { _is_null: false, _gte: $now, _lte: $dueSoonCutoff }
        }
      }
    ) {
      aggregate { count }
    }
    overdue: route_step_assignees_aggregate(
      where: {
        status: { _eq: "active" }
        step: {
          status: { _eq: "active" }
          due_at: { _is_null: false, _lt: $now }
        }
      }
    ) {
      aggregate { count }
    }
  }
`

export const INBOX_TASKS = `
  query InboxTasks {
    route_step_assignees(
      where: {
        status: { _eq: "active" }
        step: { status: { _eq: "active" } }
      }
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

export const INBOX_ASSIGNMENT = `
  query InboxAssignment($id: uuid!) {
    route_step_assignees_by_pk(id: $id) {
      id
      status
      step {
        id
        action
        due_at
        route {
          id
          document_id
          version_id
          document {
            title
            reference_number
            status
          }
          version {
            id
            original_sha256
            document_files(where: { file_role: { _eq: "original" } }, limit: 1) {
              id
              file_name
            }
          }
        }
      }
      signature_fields {
        id
        field_type
        page_number
        x
        y
        width
        height
        required
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

export type OrgProfilesResponse = {
  profiles: Array<{
    id: string
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
  dueSoon: { aggregate: { count: number } | null }
  overdue: { aggregate: { count: number } | null }
}

type InboxAssigneeRow = {
  id: string
  status: string
  signature_fields?: Array<{
    id: string
    field_type: string
    page_number: number
    x: number
    y: number
    width: number
    height: number
    required: boolean
  }>
  step: {
    id: string
    action: string
    due_at: string | null
    route: {
      id: string
      document_id: string
      version_id: string
      document: { title: string; reference_number: string | null; status?: string } | null
      version: {
        id: string
        original_sha256: string | null
        document_files: Array<{ id: string; file_name: string }>
      } | null
    } | null
  } | null
}

export type InboxTasksResponse = {
  route_step_assignees: InboxAssigneeRow[]
}

export type InboxAssignmentResponse = {
  route_step_assignees_by_pk: InboxAssigneeRow | null
}

export const DOCUMENT_AUDIT_EVENTS = `
  query DocumentAuditEvents($documentId: uuid!) {
    audit_events(
      where: { document_id: { _eq: $documentId } }
      order_by: { created_at: desc }
      limit: 100
    ) {
      id
      event_type
      entity_type
      entity_id
      user_id
      reason
      source
      integrity_hash
      created_at
      user {
        display_name
      }
    }
  }
`

export const RECENT_AUDIT_EVENTS = `
  query RecentAuditEvents {
    audit_events(order_by: { created_at: desc }, limit: 50) {
      id
      event_type
      document_id
      source
      integrity_hash
      created_at
      user {
        display_name
      }
      document {
        title
        reference_number
      }
    }
  }
`

export const DOCUMENT_CERTIFICATE = `
  query DocumentCertificate($documentId: uuid!) {
    completion_certificates(
      where: { document_id: { _eq: $documentId } }
      order_by: { issued_at: desc }
      limit: 1
    ) {
      id
      verification_code
      issued_at
      route_id
    }
  }
`

export type DocumentAuditEventsResponse = {
  audit_events: Array<{
    id: string
    event_type: string
    entity_type: string
    entity_id: string | null
    user_id: string | null
    reason: string | null
    source: string
    integrity_hash: string | null
    created_at: string
    user: { display_name: string } | null
  }>
}

export type RecentAuditEventsResponse = {
  audit_events: Array<{
    id: string
    event_type: string
    document_id: string | null
    source: string
    integrity_hash: string | null
    created_at: string
    user: { display_name: string } | null
    document: { title: string; reference_number: string | null } | null
  }>
}

export type DocumentCertificateResponse = {
  completion_certificates: Array<{
    id: string
    verification_code: string
    issued_at: string
    route_id: string
  }>
}
