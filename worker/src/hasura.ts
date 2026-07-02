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
