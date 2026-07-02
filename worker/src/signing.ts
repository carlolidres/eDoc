import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { advanceDocumentRoute, hasuraAdminRequest } from './hasura'
import { assertFileAccess, getProfileEmail } from './files'
import { normalizedFieldToPdfRect } from './pdfCoordinates'
import { verifyPasswordReauth } from './reauth'

type HasuraEnv = {
  HASURA_GRAPHQL_URL: string
  HASURA_ADMIN_SECRET: string
  NHOST_JWKS_URL: string
}

type SignatureFieldRow = {
  id: string
  field_type: string
  page_number: number
  x: number
  y: number
  width: number
  height: number
  required: number | boolean
}

export interface SignDocumentInput {
  documentId: string
  routeId: string
  assigneeRowId: string
  userId: string
  versionSha256: string
  password: string
  consent: boolean
  signatureMeaning: string
  typedSignature: string
  idempotencyKey: string
  requestId: string
  ipAddress?: string
  userAgent?: string
}

async function findIdempotentSignResponse(env: HasuraEnv, idempotencyKey: string, assigneeRowId: string) {
  const data = await hasuraAdminRequest<{
    audit_events: Array<{ new_value: { response?: Record<string, unknown> } | null }>
  }>(
    env,
    `query IdempotentSign($requestId: String!, $assigneeId: uuid!) {
      audit_events(
        where: {
          request_id: { _eq: $requestId }
          entity_id: { _eq: $assigneeId }
          event_type: { _eq: "assignee.signed" }
        }
        limit: 1
      ) {
        new_value
      }
    }`,
    { requestId: idempotencyKey, assigneeId: assigneeRowId },
  )
  return data.audit_events[0]?.new_value?.response ?? null
}

async function loadSigningContext(env: HasuraEnv, input: SignDocumentInput) {
  const routeData = await hasuraAdminRequest<{
    document_routes_by_pk: {
      id: string
      document_id: string
      version_id: string
      organization_id: string
    } | null
  }>(
    env,
    `query RouteVersion($routeId: uuid!) {
      document_routes_by_pk(id: $routeId) {
        id
        document_id
        version_id
        organization_id
      }
    }`,
    { routeId: input.routeId },
  )

  const route = routeData.document_routes_by_pk
  if (!route) {
    return {
      document_routes_by_pk: null,
      document_versions_by_pk: null,
      document_files: [],
      route_step_assignees_by_pk: null,
      signature_fields: [],
    }
  }

  return hasuraAdminRequest<{
    document_routes_by_pk: typeof route
    document_versions_by_pk: {
      id: string
      original_sha256: string | null
    } | null
    document_files: Array<{ id: string; file_role: string; r2_object_key: string; file_name: string }>
    route_step_assignees_by_pk: {
      id: string
      assignee_id: string
      status: string
      step: { route_id: string; status: string; action: string } | null
    } | null
    signature_fields: SignatureFieldRow[]
  }>(
    env,
    `query SigningContext($routeId: uuid!, $assigneeRowId: uuid!, $versionId: uuid!) {
      document_routes_by_pk(id: $routeId) {
        id
        document_id
        version_id
        organization_id
      }
      document_versions_by_pk(id: $versionId) {
        id
        original_sha256
      }
      document_files(
        where: { version_id: { _eq: $versionId }, file_role: { _eq: "original" } }
        limit: 1
      ) {
        id
        file_role
        r2_object_key
        file_name
      }
      route_step_assignees_by_pk(id: $assigneeRowId) {
        id
        assignee_id
        status
        step {
          route_id
          status
          action
        }
      }
      signature_fields(where: { assignee_id: { _eq: $assigneeRowId } }) {
        id
        field_type
        page_number
        x
        y
        width
        height
        required
      }
    }`,
    { routeId: input.routeId, assigneeRowId: input.assigneeRowId, versionId: route.version_id },
  )
}

function buildSignedObjectKey(input: {
  organizationId: string
  documentId: string
  versionId: string
  fileName: string
}) {
  return `organizations/${input.organizationId}/documents/${input.documentId}/versions/${input.versionId}/signed/${input.fileName}`
}

async function applySignatureToPdf(
  pdfBytes: ArrayBuffer,
  fields: SignatureFieldRow[],
  typedSignature: string,
  signatureMeaning: string,
) {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  for (const field of fields) {
    const pageIndex = field.page_number - 1
    const page = pdfDoc.getPage(pageIndex)
    if (!page) continue
    const { width: pageWidth, height: pageHeight } = page.getSize()
    const rect = normalizedFieldToPdfRect(pageWidth, pageHeight, field)

    const isSignatureField = field.field_type === 'signature' || field.field_type === 'initial'
    const text = isSignatureField
      ? typedSignature
      : field.field_type === 'date_signed'
        ? new Date().toLocaleDateString()
        : field.field_type.includes('meaning')
          ? signatureMeaning
          : ''

    if (!text) continue

    const fontSize = Math.min(rect.height * 0.7, 14)
    page.drawText(text, {
      x: rect.x + 2,
      y: rect.y + Math.max(2, (rect.height - fontSize) / 2),
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.35),
      maxWidth: rect.width - 4,
    })
  }

  return pdfDoc.save()
}

export async function signDocument(
  env: HasuraEnv,
  bucket: R2Bucket,
  input: SignDocumentInput,
) {
  if (!input.consent) throw new Error('Consent is required before signing.')
  if (!input.signatureMeaning.trim()) throw new Error('Signature meaning is required.')
  if (!input.typedSignature.trim()) throw new Error('Typed signature is required.')

  const cached = await findIdempotentSignResponse(env, input.idempotencyKey, input.assigneeRowId)
  if (cached) return { ...cached, idempotent: true }

  const context = await loadSigningContext(env, input)
  const route = context.document_routes_by_pk
  const assignee = context.route_step_assignees_by_pk

  if (!route) throw new Error('Route was not found.')
  if (route.document_id !== input.documentId) throw new Error('Document does not match this route.')
  if (!assignee?.step) throw new Error('Assignee was not found.')
  if (assignee.step.route_id !== input.routeId) throw new Error('Assignee does not belong to this route.')
  if (assignee.assignee_id !== input.userId) throw new Error('You are not authorized to sign this assignment.')
  if (assignee.status !== 'active') throw new Error('Only active assignments can be signed.')
  if (assignee.step.status !== 'active') throw new Error('This route step is not active.')
  if (assignee.step.action !== 'sign') throw new Error('This assignment is not a sign step.')

  const version = context.document_versions_by_pk
  if (!version || version.id !== route.version_id) throw new Error('Document version was not found.')
  const expectedHash = version.original_sha256
  if (!expectedHash) throw new Error('Document version hash is not available.')
  if (expectedHash !== input.versionSha256) {
    throw new Error('Document version changed. Reload the signing workspace and try again.')
  }

  const originalFile = context.document_files[0]
  if (!originalFile) throw new Error('Original PDF was not found for this version.')

  await assertFileAccess(env, originalFile.id, input.userId)

  const email = await getProfileEmail(env, input.userId)
  const reauth = await verifyPasswordReauth(env, email, input.password)

  const object = await bucket.get(originalFile.r2_object_key)
  if (!object) throw new Error('PDF file was not found in storage.')

  const signedBytes = await applySignatureToPdf(
    await object.arrayBuffer(),
    context.signature_fields,
    input.typedSignature.trim(),
    input.signatureMeaning.trim(),
  )

  const signedFileName = originalFile.file_name.replace(/\.pdf$/i, '') + '-signed.pdf'
  const signedObjectKey = buildSignedObjectKey({
    organizationId: route.organization_id,
    documentId: route.document_id,
    versionId: route.version_id,
    fileName: signedFileName,
  })

  await bucket.put(signedObjectKey, signedBytes, {
    httpMetadata: { contentType: 'application/pdf' },
  })

  const digest = await crypto.subtle.digest('SHA-256', signedBytes)
  const finalPdfHash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')

  const signedFileId = crypto.randomUUID()
  const signatureEventId = crypto.randomUUID()
  const authEventId = crypto.randomUUID()

  await hasuraAdminRequest(
    env,
    `mutation RecordSignedFile(
      $file: document_files_insert_input!
      $signatureEvent: signature_events_insert_input!
      $authEvent: signature_authentication_events_insert_input!
    ) {
      insert_document_files_one(object: $file) {
        id
      }
      insert_signature_events_one(object: $signatureEvent) {
        id
      }
      insert_signature_authentication_events_one(object: $authEvent) {
        id
      }
    }`,
    {
      file: {
        id: signedFileId,
        organization_id: route.organization_id,
        document_id: route.document_id,
        version_id: route.version_id,
        file_role: 'signed',
        file_name: signedFileName,
        mime_type: 'application/pdf',
        size_bytes: signedBytes.byteLength,
        r2_object_key: signedObjectKey,
        sha256: finalPdfHash,
      },
      signatureEvent: {
        id: signatureEventId,
        organization_id: route.organization_id,
        document_id: route.document_id,
        version_id: route.version_id,
        assignee_id: input.assigneeRowId,
        signer_id: input.userId,
        signature_meaning: input.signatureMeaning.trim(),
        auth_method: reauth.method,
        document_hash: expectedHash,
        final_pdf_hash: finalPdfHash,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
      },
      authEvent: {
        id: authEventId,
        organization_id: route.organization_id,
        signature_event_id: signatureEventId,
        auth_method: reauth.method,
        success: true,
        ip_address: input.ipAddress ?? null,
      },
    },
  )

  const advanceResult = await advanceDocumentRoute(env, {
    routeId: input.routeId,
    assigneeRowId: input.assigneeRowId,
    userId: input.userId,
    action: 'sign',
    comment: input.signatureMeaning.trim(),
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
  })

  return {
    signatureEventId,
    signedFileId,
    finalPdfHash,
    documentHash: expectedHash,
    ...advanceResult,
    idempotent: false,
  }
}
