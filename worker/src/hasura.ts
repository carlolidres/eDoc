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

type RoutingMode = 'sequential' | 'parallel' | 'mixed'

type RouteStepRow = {
  id: string
  sequence: number
  status: string
}

function getInitialActiveStepIds(mode: RoutingMode, steps: RouteStepRow[]): string[] {
  const ordered = [...steps].sort((a, b) => a.sequence - b.sequence)
  if (mode === 'parallel') {
    return ordered.filter((step) => step.status === 'pending').map((step) => step.id)
  }
  const firstPending = ordered.find((step) => step.status === 'pending')
  return firstPending ? [firstPending.id] : []
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
