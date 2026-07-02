import {
  type AssigneeState,
  type CompletionRule,
  type RoutingMode,
  type StepStatus,
  getNextActiveStepIds,
  isRouteComplete,
  isStepCompleteByRule,
  shouldInvalidateRemainingAssignees,
} from './routing'

type HasuraEnv = {
  HASURA_GRAPHQL_URL: string
  HASURA_ADMIN_SECRET: string
}

export async function hasuraAdminRequest<T>(
  env: HasuraEnv,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = env.HASURA_GRAPHQL_URL
  const secret = env.HASURA_ADMIN_SECRET
  if (!url || url.includes('your-') || !secret || secret.includes('replace-')) {
    throw new Error('Hasura admin credentials are not configured.')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': secret,
    },
    body: JSON.stringify({ query, variables }),
  })

  const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (!response.ok || body.errors?.length) {
    throw new Error(body.errors?.[0]?.message ?? `Hasura request failed with ${response.status}`)
  }
  if (!body.data) throw new Error('Hasura returned no data.')
  return body.data
}

export async function assertDocumentOwner(
  env: HasuraEnv,
  documentId: string,
  userId: string,
): Promise<{ organization_id: string; owner_id: string }> {
  const data = await hasuraAdminRequest<{
    documents_by_pk: { organization_id: string; owner_id: string } | null
  }>(
    env,
    `query DocumentOwner($id: uuid!) {
      documents_by_pk(id: $id) {
        organization_id
        owner_id
      }
    }`,
    { id: documentId },
  )

  const document = data.documents_by_pk
  if (!document) throw new Error('Document was not found.')
  if (document.owner_id !== userId) throw new Error('You are not authorized to upload files for this document.')
  return document
}

export async function insertDocumentFile(
  env: HasuraEnv,
  input: {
    id: string
    organizationId: string
    documentId: string
    versionId: string
    fileName: string
    mimeType: string
    sizeBytes: number
    objectKey: string
    sha256: string
  },
) {
  await hasuraAdminRequest(
    env,
    `mutation InsertDocumentFile($object: document_files_insert_input!) {
      insert_document_files_one(object: $object) {
        id
      }
    }`,
    {
      object: {
        id: input.id,
        organization_id: input.organizationId,
        document_id: input.documentId,
        version_id: input.versionId,
        file_role: 'original',
        file_name: input.fileName,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        r2_object_key: input.objectKey,
        sha256: input.sha256,
      },
    },
  )
}

export async function markDocumentPreparing(env: HasuraEnv, documentId: string, versionId: string, sha256: string) {
  await hasuraAdminRequest(
    env,
    `mutation MarkDocumentPreparing($documentId: uuid!, $versionId: uuid!, $sha256: String!) {
      update_documents_by_pk(pk_columns: { id: $documentId }, _set: { status: "preparing" }) {
        id
      }
      update_document_versions_by_pk(
        pk_columns: { id: $versionId }
        _set: { original_sha256: $sha256 }
      ) {
        id
      }
    }`,
    { documentId, versionId, sha256 },
  )
}

async function toSha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashR2Object(bucket: R2Bucket, objectKey: string) {
  const object = await bucket.get(objectKey)
  if (!object) throw new Error('Uploaded file was not found in storage.')
  return toSha256Hex(await object.arrayBuffer())
}

type RouteStepRow = {
  id: string
  sequence: number
  status: string
}

function getInitialActiveStepIds(mode: RoutingMode, steps: RouteStepRow[]): string[] {
  return getNextActiveStepIds(mode, steps.map((step) => ({
    id: step.id,
    sequence: step.sequence,
    status: step.status as StepStatus,
  })))
}

export async function startDocumentRoute(
  env: HasuraEnv,
  routeId: string,
  userId: string,
  requestId: string,
) {
  const data = await hasuraAdminRequest<{
    document_routes_by_pk: {
      id: string
      status: string
      mode: RoutingMode
      organization_id: string
      document_id: string
      version_id: string
      document: { owner_id: string; status: string } | null
      route_steps: RouteStepRow[]
    } | null
  }>(
    env,
    `query RouteForStart($id: uuid!) {
      document_routes_by_pk(id: $id) {
        id
        status
        mode
        organization_id
        document_id
        version_id
        document {
          owner_id
          status
        }
        route_steps(order_by: { sequence: asc }) {
          id
          sequence
          status
        }
      }
    }`,
    { id: routeId },
  )

  const route = data.document_routes_by_pk
  if (!route) throw new Error('Route was not found.')
  if (!route.document) throw new Error('Route document was not found.')
  if (route.document.owner_id !== userId) throw new Error('You are not authorized to start this route.')
  if (route.status !== 'draft') throw new Error('Only draft routes can be started.')
  if (route.document.status !== 'ready_for_routing') {
    throw new Error('Document must be ready for routing before the route can start.')
  }
  if (!route.route_steps.length) throw new Error('Route has no steps.')

  const activeStepIds = getInitialActiveStepIds(route.mode, route.route_steps)
  if (!activeStepIds.length) throw new Error('Route has no pending steps to activate.')

  const startedAt = new Date().toISOString()

  await hasuraAdminRequest(
    env,
    `mutation StartRoute(
      $routeId: uuid!
      $documentId: uuid!
      $startedAt: timestamptz!
      $stepIds: [uuid!]!
      $audit: audit_events_insert_input!
    ) {
      update_document_routes_by_pk(
        pk_columns: { id: $routeId }
        _set: { status: "active", started_at: $startedAt }
      ) {
        id
      }
      update_documents_by_pk(pk_columns: { id: $documentId }, _set: { status: "in_routing" }) {
        id
      }
      update_route_steps(where: { id: { _in: $stepIds } }, _set: { status: "active" }) {
        affected_rows
      }
      update_route_step_assignees(
        where: { step_id: { _in: $stepIds }, status: { _eq: "pending" } }
        _set: { status: "active" }
      ) {
        affected_rows
      }
      insert_audit_events_one(object: $audit) {
        id
      }
    }`,
    {
      routeId,
      documentId: route.document_id,
      startedAt,
      stepIds: activeStepIds,
      audit: {
        organization_id: route.organization_id,
        user_id: userId,
        event_type: 'route.started',
        entity_type: 'document_route',
        entity_id: routeId,
        document_id: route.document_id,
        version_id: route.version_id,
        previous_value: { route_status: 'draft', document_status: route.document.status },
        new_value: { route_status: 'active', document_status: 'in_routing', active_step_ids: activeStepIds },
        request_id: requestId,
        source: 'worker',
      },
    },
  )

  return {
    routeId,
    documentId: route.document_id,
    activeStepIds,
    status: 'active' as const,
  }
}

export type AdvanceAction = 'review' | 'approve' | 'acknowledge' | 'reject' | 'return'

type AssigneeRow = {
  id: string
  assignee_id: string
  status: string
}

type AdvanceStepRow = {
  id: string
  sequence: number
  status: string
  action: string
  completion_rule: CompletionRule
  minimum_count: number | null
  route_step_assignees: AssigneeRow[]
}

const POSITIVE_ACTIONS = new Set<AdvanceAction>(['review', 'approve', 'acknowledge'])

function auditEventTypeForAction(action: AdvanceAction): string {
  switch (action) {
    case 'review':
      return 'assignee.reviewed'
    case 'approve':
      return 'assignee.approved'
    case 'acknowledge':
      return 'assignee.acknowledged'
    case 'reject':
      return 'assignee.rejected'
    case 'return':
      return 'assignee.returned'
  }
}

function assigneeStatusForAction(action: AdvanceAction): string {
  if (POSITIVE_ACTIONS.has(action)) return 'completed'
  return action
}

function actionRecordStatus(action: AdvanceAction): string {
  if (POSITIVE_ACTIONS.has(action)) return 'completed'
  return action
}

function projectedAssignees(assignees: AssigneeRow[], assigneeRowId: string, action: AdvanceAction): AssigneeState[] {
  const nextStatus = assigneeStatusForAction(action)
  return assignees.map((assignee) => ({
    id: assignee.id,
    status: assignee.id === assigneeRowId ? (nextStatus as AssigneeState['status']) : (assignee.status as AssigneeState['status']),
  }))
}

async function findIdempotentAdvanceResponse(
  env: HasuraEnv,
  idempotencyKey: string,
  assigneeRowId: string,
) {
  const data = await hasuraAdminRequest<{
    audit_events: Array<{ new_value: { response?: Record<string, unknown> } | null }>
  }>(
    env,
    `query IdempotentAdvance($requestId: String!, $assigneeId: uuid!) {
      audit_events(
        where: {
          request_id: { _eq: $requestId }
          entity_id: { _eq: $assigneeId }
          event_type: { _in: ["assignee.reviewed", "assignee.approved", "assignee.acknowledged", "assignee.rejected", "assignee.returned"] }
        }
        limit: 1
      ) {
        new_value
      }
    }`,
    { requestId: idempotencyKey, assigneeId: assigneeRowId },
  )

  const cached = data.audit_events[0]?.new_value?.response
  return cached ?? null
}

export async function advanceDocumentRoute(
  env: HasuraEnv,
  input: {
    routeId: string
    assigneeRowId: string
    userId: string
    action: AdvanceAction
    comment?: string
    reason?: string
    idempotencyKey: string
    requestId: string
  },
) {
  const cached = await findIdempotentAdvanceResponse(env, input.idempotencyKey, input.assigneeRowId)
  if (cached) return cached

  const data = await hasuraAdminRequest<{
    document_routes_by_pk: {
      id: string
      status: string
      mode: RoutingMode
      organization_id: string
      document_id: string
      version_id: string
      route_steps: AdvanceStepRow[]
    } | null
    route_step_assignees_by_pk: {
      id: string
      assignee_id: string
      status: string
      step_id: string
      step: { route_id: string; status: string; action: string } | null
    } | null
  }>(
    env,
    `query RouteForAdvance($routeId: uuid!, $assigneeRowId: uuid!) {
      document_routes_by_pk(id: $routeId) {
        id
        status
        mode
        organization_id
        document_id
        version_id
        route_steps(order_by: { sequence: asc }) {
          id
          sequence
          status
          action
          completion_rule
          minimum_count
          route_step_assignees {
            id
            assignee_id
            status
          }
        }
      }
      route_step_assignees_by_pk(id: $assigneeRowId) {
        id
        assignee_id
        status
        step_id
        step {
          route_id
          status
          action
        }
      }
    }`,
    { routeId: input.routeId, assigneeRowId: input.assigneeRowId },
  )

  const route = data.document_routes_by_pk
  const assigneeRow = data.route_step_assignees_by_pk
  if (!route) throw new Error('Route was not found.')
  if (!assigneeRow?.step) throw new Error('Assignee was not found.')
  if (assigneeRow.step.route_id !== input.routeId) throw new Error('Assignee does not belong to this route.')
  if (assigneeRow.assignee_id !== input.userId) throw new Error('You are not authorized to act on this assignment.')
  if (route.status !== 'active') throw new Error('Only active routes can be advanced.')
  if (assigneeRow.status !== 'active') throw new Error('Only active assignments can be advanced.')
  if (assigneeRow.step.status !== 'active') throw new Error('This route step is not active.')

  const step = route.route_steps.find((row) => row.id === assigneeRow.step_id)
  if (!step) throw new Error('Route step was not found.')

  if (step.action === 'sign' && POSITIVE_ACTIONS.has(input.action)) {
    throw new Error('Sign steps must use the signing endpoint.')
  }

  if (POSITIVE_ACTIONS.has(input.action) && input.action !== step.action) {
    throw new Error(`This step requires the ${step.action} action.`)
  }

  const now = new Date().toISOString()
  const eventType = auditEventTypeForAction(input.action)
  const assigneeStatus = assigneeStatusForAction(input.action)
  const actionId = crypto.randomUUID()
  const auditId = crypto.randomUUID()

  const projectedStepAssignees = projectedAssignees(step.route_step_assignees, input.assigneeRowId, input.action)
  const isTerminalAction = input.action === 'reject' || input.action === 'return'
  const stepCompletes =
    !isTerminalAction &&
    isStepCompleteByRule(step.completion_rule, projectedStepAssignees, step.minimum_count)

  const invalidateAssigneeIds: string[] = []
  if (!isTerminalAction && shouldInvalidateRemainingAssignees(step.completion_rule, projectedStepAssignees)) {
    for (const assignee of step.route_step_assignees) {
      if (assignee.id !== input.assigneeRowId && (assignee.status === 'pending' || assignee.status === 'active')) {
        invalidateAssigneeIds.push(assignee.id)
      }
    }
  }

  let stepStatus = step.status
  if (isTerminalAction) stepStatus = input.action
  else if (stepCompletes) stepStatus = 'completed'

  const projectedSteps = route.route_steps.map((row) => ({
    id: row.id,
    sequence: row.sequence,
    status: (row.id === step.id ? stepStatus : row.status) as StepStatus,
  }))

  const nextActiveStepIds =
    !isTerminalAction && stepCompletes ? getNextActiveStepIds(route.mode, projectedSteps) : []

  const routeCompletes = !isTerminalAction && stepCompletes && isRouteComplete(projectedSteps)
  const routeStatus = isTerminalAction ? input.action : routeCompletes ? 'completed' : route.status
  const documentStatus = isTerminalAction ? input.action : routeCompletes ? 'completed' : 'in_routing'

  const invalidateRouteAssigneeIds: string[] = []
  if (isTerminalAction || routeCompletes) {
    for (const routeStep of route.route_steps) {
      for (const assignee of routeStep.route_step_assignees) {
        if (assignee.id === input.assigneeRowId) continue
        if (assignee.status === 'pending' || assignee.status === 'active') {
          invalidateRouteAssigneeIds.push(assignee.id)
        }
      }
    }
  }

  const allInvalidateIds = [...new Set([...invalidateAssigneeIds, ...invalidateRouteAssigneeIds])]

  const response = {
    routeId: input.routeId,
    assigneeRowId: input.assigneeRowId,
    stepId: step.id,
    action: input.action,
    assigneeStatus,
    stepStatus,
    routeStatus,
    documentStatus,
    routeCompleted: routeCompletes,
    nextActiveStepIds,
    idempotent: false,
  }

  await hasuraAdminRequest(
    env,
    `mutation AdvanceRoute(
      $assigneeRowId: uuid!
      $assigneeStatus: String!
      $completedAt: timestamptz!
      $actionId: uuid!
      $organizationId: uuid!
      $stepId: uuid!
      $action: String!
      $actionStatus: String!
      $comment: String!
      $reason: String
      $audit: audit_events_insert_input!
      $stepStatus: String
      $routeId: uuid!
      $routeStatus: String
      $routeCompletedAt: timestamptz
      $documentId: uuid!
      $documentStatus: String
      $nextStepIds: [uuid!]!
      $invalidateIds: [uuid!]!
    ) {
      update_route_step_assignees_by_pk(
        pk_columns: { id: $assigneeRowId }
        _set: { status: $assigneeStatus, completed_at: $completedAt }
      ) {
        id
      }
      insert_route_step_actions_one(
        object: {
          id: $actionId
          organization_id: $organizationId
          step_id: $stepId
          assignee_id: $assigneeRowId
          action: $action
          status: $actionStatus
          comment: $comment
          reason: $reason
        }
      ) {
        id
      }
      insert_audit_events_one(object: $audit) {
        id
      }
      update_route_steps_by_pk(pk_columns: { id: $stepId }, _set: { status: $stepStatus }) {
        id
      }
      update_route_steps(where: { id: { _in: $nextStepIds } }, _set: { status: "active" }) {
        affected_rows
      }
      activate_next_assignees: update_route_step_assignees(
        where: { step_id: { _in: $nextStepIds }, status: { _eq: "pending" } }
        _set: { status: "active" }
      ) {
        affected_rows
      }
      invalidate_assignees: update_route_step_assignees(
        where: { id: { _in: $invalidateIds } }
        _set: { status: "invalidated" }
      ) {
        affected_rows
      }
      update_document_routes_by_pk(
        pk_columns: { id: $routeId }
        _set: { status: $routeStatus, completed_at: $routeCompletedAt }
      ) {
        id
      }
      update_documents_by_pk(pk_columns: { id: $documentId }, _set: { status: $documentStatus }) {
        id
      }
    }`,
    {
      assigneeRowId: input.assigneeRowId,
      assigneeStatus,
      completedAt: now,
      actionId,
      organizationId: route.organization_id,
      stepId: step.id,
      action: input.action,
      actionStatus: actionRecordStatus(input.action),
      comment: input.comment ?? '',
      reason: input.reason ?? null,
      audit: {
        id: auditId,
        organization_id: route.organization_id,
        user_id: input.userId,
        event_type: eventType,
        entity_type: 'route_step_assignee',
        entity_id: input.assigneeRowId,
        document_id: route.document_id,
        version_id: route.version_id,
        previous_value: { assignee_status: assigneeRow.status, step_status: step.status, route_status: route.status },
        new_value: { ...response, response },
        reason: input.reason ?? null,
        request_id: input.idempotencyKey,
        source: 'worker',
      },
      stepStatus,
      routeId: input.routeId,
      routeStatus,
      routeCompletedAt: routeCompletes ? now : null,
      documentId: route.document_id,
      documentStatus,
      nextStepIds: nextActiveStepIds,
      invalidateIds: allInvalidateIds,
    },
  )

  return response
}
