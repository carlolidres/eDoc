import { hasuraAdminRequest } from './hasura'

type HasuraEnv = {
  HASURA_GRAPHQL_URL: string
  HASURA_ADMIN_SECRET: string
}

export type DocumentFileRow = {
  id: string
  organization_id: string
  document_id: string
  version_id: string
  file_role: string
  file_name: string
  mime_type: string
  r2_object_key: string
  sha256: string | null
}

const ASSIGNEE_DOCUMENT_FILTER = `
  _or: [
    { owner_id: { _eq: $userId } }
    { document_access_grants: { grantee_id: { _eq: $userId } } }
    {
      document_routes: {
        route_steps: {
          route_step_assignees: {
            assignee_id: { _eq: $userId }
            status: { _in: ["pending", "active", "completed"] }
          }
        }
      }
    }
  ]
`

export async function getDocumentFile(env: HasuraEnv, fileId: string): Promise<DocumentFileRow | null> {
  const data = await hasuraAdminRequest<{
    document_files_by_pk: DocumentFileRow | null
  }>(
    env,
    `query DocumentFile($id: uuid!) {
      document_files_by_pk(id: $id) {
        id
        organization_id
        document_id
        version_id
        file_role
        file_name
        mime_type
        r2_object_key
        sha256
      }
    }`,
    { id: fileId },
  )
  return data.document_files_by_pk
}

export async function assertFileAccess(env: HasuraEnv, fileId: string, userId: string): Promise<DocumentFileRow> {
  const data = await hasuraAdminRequest<{
    document_files: DocumentFileRow[]
  }>(
    env,
    `query AuthorizedFile($fileId: uuid!, $userId: uuid!) {
      document_files(
        where: {
          id: { _eq: $fileId }
          document: { ${ASSIGNEE_DOCUMENT_FILTER} }
        }
        limit: 1
      ) {
        id
        organization_id
        document_id
        version_id
        file_role
        file_name
        mime_type
        r2_object_key
        sha256
      }
    }`,
    { fileId, userId },
  )

  const file = data.document_files[0]
  if (!file) throw new Error('You are not authorized to access this file.')
  return file
}

export async function getProfileEmail(env: HasuraEnv, userId: string): Promise<string> {
  const data = await hasuraAdminRequest<{
    profiles_by_pk: { email: string } | null
  }>(
    env,
    `query ProfileEmail($id: uuid!) {
      profiles_by_pk(id: $id) {
        email
      }
    }`,
    { id: userId },
  )
  const email = data.profiles_by_pk?.email
  if (!email) throw new Error('Signer profile was not found.')
  return email
}

export async function logFileAccess(
  env: HasuraEnv,
  input: {
    organizationId: string
    fileId: string
    userId: string
    accessType: 'preview' | 'download'
    ipAddress?: string
  },
) {
  await hasuraAdminRequest(
    env,
    `mutation LogFileAccess($object: file_access_logs_insert_input!) {
      insert_file_access_logs_one(object: $object) {
        id
      }
    }`,
    {
      object: {
        id: crypto.randomUUID(),
        organization_id: input.organizationId,
        file_id: input.fileId,
        profile_id: input.userId,
        access_type: input.accessType,
        ip_address: input.ipAddress ?? null,
      },
    },
  )
}
